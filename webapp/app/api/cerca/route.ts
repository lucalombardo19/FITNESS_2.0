import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { query, dietary, limit = 10, apiKey } = await req.json();
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) return NextResponse.json({ error: 'API key mancante' }, { status: 401 });

    const client = new Anthropic({ apiKey: key });
    const r = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Nutrizionista esperto. Trova ${limit} alimenti per: "${query}".
Restrizioni: ${(dietary ?? []).join(', ') || 'nessuna'}.
Dati per 100g. Alimenti comuni in Italia.
JSON ONLY: {"results":[{"name":"","calories_per_100g":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"similarity_score":0.9}]}`,
      }],
    });

    const text = (r.content[0] as { text: string }).text;
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const data = JSON.parse(m[0]);
      return NextResponse.json({ results: data.results ?? [] });
    }
    return NextResponse.json({ results: [] });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
