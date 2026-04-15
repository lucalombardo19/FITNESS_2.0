import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType: string;
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
    const { query, dietary, limit = 10, apiKey, usdaKey } = await req.json();

    const anthropicKey = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return NextResponse.json({ error: 'Anthropic API key mancante' }, { status: 401 });

    const usdaApiKey = usdaKey || process.env.USDA_API_KEY || 'DEMO_KEY';
    const client = new Anthropic({ apiKey: anthropicKey });

    // Step 1 — Claude traduce la query italiana in termini di ricerca inglesi per USDA
    const translateResp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 60,
      messages: [{ role: 'user', content: `Translate this Italian food query to English for USDA database search. Return ONLY the search terms, nothing else: "${query}"` }],
    });
    const englishQuery = (translateResp.content[0] as { text: string }).text.trim();

    // Step 2 — Cerca nel database USDA FoodData Central
    const usdaUrl = `${USDA_BASE}/foods/search?query=${encodeURIComponent(englishQuery)}&pageSize=${Math.min(limit * 3, 25)}&api_key=${usdaApiKey}&dataType=Foundation,SR%20Legacy`;
    const usdaRes = await fetch(usdaUrl);

    if (!usdaRes.ok) {
      const errText = await usdaRes.text();
      throw new Error(usdaApiKey === 'DEMO_KEY'
        ? 'Limite DEMO_KEY USDA raggiunto. Aggiungi una USDA API Key gratuita nelle Impostazioni.'
        : `USDA API errore ${usdaRes.status}: ${errText}`
      );
    }

    const usdaData = await usdaRes.json();
    const foods: USDAFood[] = usdaData.foods ?? [];

    if (foods.length === 0) {
      return NextResponse.json({ results: [], source: 'usda' });
    }

    // Step 3 — Claude seleziona i più rilevanti e traduce i nomi in italiano
    const foodList = foods.map((f, i) => `${i}: ${f.description}`).join('\n');
    const rankResp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `User searched: "${query}" (Italian). USDA returned these foods (English names):
${foodList}

Select the ${limit} most relevant to the Italian query and translate names to Italian.
Respect dietary restrictions: ${(dietary ?? []).join(', ') || 'none'}.
JSON ONLY: {"ranked":[{"index":0,"italian_name":"nome in italiano","score":0.97}]}`,
      }],
    });

    const rankText = (rankResp.content[0] as { text: string }).text;
    const rankMatch = rankText.match(/\{[\s\S]*\}/);

    let results;
    if (rankMatch) {
      try {
        const ranked: Array<{ index: number; italian_name: string; score: number }> = JSON.parse(rankMatch[0]).ranked ?? [];
        results = ranked
          .filter(r => r.index >= 0 && r.index < foods.length)
          .map(r => mapFood(foods[r.index], r.italian_name, r.score));
      } catch {
        results = foods.slice(0, limit).map((f, i) => mapFood(f, f.description, 1 - i * 0.05));
      }
    } else {
      results = foods.slice(0, limit).map((f, i) => mapFood(f, f.description, 1 - i * 0.05));
    }

    return NextResponse.json({ results, source: 'usda' });

  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err?.message ?? 'Errore ricerca' }, { status: 500 });
  }
}
