import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  foodNutrients: Array<{ nutrientId: number; value: number }>;
}

function getNutrient(food: USDAFood, id: number): number {
  return food.foodNutrients?.find(n => n.nutrientId === id)?.value ?? 0;
}

function mapFood(food: USDAFood, italianName: string, score: number) {
  return {
    name: italianName || food.description,
    brand: food.brandOwner ?? undefined,
    calories_per_100g: getNutrient(food, 1008),
    protein_g: getNutrient(food, 1003),
    carbs_g: getNutrient(food, 1005),
    fat_g: getNutrient(food, 1004),
    fiber_g: getNutrient(food, 1079) || undefined,
    similarity_score: score,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const uid = parseInt((session.user as { id?: string }).id ?? '0');
    const row = db.prepare('SELECT anthropic_key, usda_key FROM user_data WHERE user_id = ?').get(uid) as { anthropic_key?: string; usda_key?: string } | undefined;

    const anthropicKey = row?.anthropic_key || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return NextResponse.json({ error: 'Anthropic API key non configurata' }, { status: 401 });

    const usdaApiKey = row?.usda_key || process.env.USDA_API_KEY || 'DEMO_KEY';
    const { query, dietary, limit = 10 } = await req.json();

    const client = new Anthropic({ apiKey: anthropicKey });

    // Translate query to English for USDA
    const tr = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 60,
      messages: [{ role: 'user', content: `Translate to English for USDA food database search. Return ONLY search terms: "${query}"` }],
    });
    const englishQuery = (tr.content[0] as { text: string }).text.trim();

    // Search USDA
    const usdaUrl = `${USDA_BASE}/foods/search?query=${encodeURIComponent(englishQuery)}&pageSize=${Math.min(limit*3,25)}&api_key=${usdaApiKey}&dataType=Foundation,SR%20Legacy`;
    const usdaRes = await fetch(usdaUrl);

    if (!usdaRes.ok) {
      throw new Error(usdaApiKey === 'DEMO_KEY'
        ? 'Limite DEMO_KEY USDA raggiunto. Aggiungi una USDA API Key nelle Impostazioni.'
        : `USDA API errore ${usdaRes.status}`);
    }

    const usdaData = await usdaRes.json();
    const foods: USDAFood[] = usdaData.foods ?? [];
    if (foods.length === 0) return NextResponse.json({ results: [], source: 'usda' });

    // Claude ranks and translates to Italian
    const foodList = foods.map((f, i) => `${i}: ${f.description}`).join('\n');
    const rankResp = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 600,
      messages: [{ role: 'user', content: `User searched: "${query}". USDA foods:\n${foodList}\n\nSelect ${limit} most relevant, translate names to Italian. Respect: ${(dietary??[]).join(', ')||'no restrictions'}.\nJSON ONLY: {"ranked":[{"index":0,"italian_name":"nome italiano","score":0.97}]}` }],
    });

    const rankMatch = (rankResp.content[0] as { text: string }).text.match(/\{[\s\S]*\}/);
    let results;
    if (rankMatch) {
      try {
        const ranked: Array<{ index: number; italian_name: string; score: number }> = JSON.parse(rankMatch[0]).ranked ?? [];
        results = ranked.filter(r => r.index >= 0 && r.index < foods.length).map(r => mapFood(foods[r.index], r.italian_name, r.score));
      } catch { results = foods.slice(0, limit).map((f, i) => mapFood(f, f.description, 1 - i*0.05)); }
    } else {
      results = foods.slice(0, limit).map((f, i) => mapFood(f, f.description, 1 - i*0.05));
    }

    return NextResponse.json({ results, source: 'usda' });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as { message?: string })?.message }, { status: 500 });
  }
}
