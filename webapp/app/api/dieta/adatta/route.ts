import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import type { DayPlan, MealPlan } from '@/lib/types';

const MODEL = 'claude-sonnet-4-6';

function extract(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const uid = parseInt((session.user as { id?: string }).id ?? '0');
    const row = db.prepare('SELECT last_plan, anthropic_key FROM user_data WHERE user_id = ?').get(uid) as { last_plan?: string; anthropic_key?: string } | undefined;

    const anthropicKey = row?.anthropic_key || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return NextResponse.json({ error: 'API key mancante' }, { status: 401 });

    const { report, dayIndex } = await req.json() as { report: string; dayIndex?: number };
    if (!report?.trim()) return NextResponse.json({ error: 'Descrivi cosa è successo oggi' }, { status: 400 });

    const plan = row?.last_plan ? JSON.parse(row.last_plan) : null;
    const mealPlan = plan?.meal_plan as MealPlan | null;
    const days = mealPlan?.days ?? [];
    const todayPlan: DayPlan | undefined = days[dayIndex ?? 0];
    const targetKcal = mealPlan?.target_kcal ?? mealPlan?.total_daily_calories ?? 2000;
    const mealsPerDay = mealPlan?.meals_per_day ?? 4;

    const prompt = `Sei un nutrizionista. Un utente ti segnala cosa è successo oggi con la dieta e chiede di adattare il piano di domani.

PIANO ORIGINALE DI OGGI:
${todayPlan ? JSON.stringify(todayPlan, null, 2) : 'Piano non disponibile'}

TARGET BASE: ${targetKcal} kcal/giorno, ${mealsPerDay} pasti

L'UTENTE RIPORTA:
"${report}"

ISTRUZIONI:
- Se ha ecceduto le calorie: riduci di 100-300 kcal domani, privilegia proteine e verdure
- Se ha mangiato meno: aggiungi 100-200 kcal, pasti più sazianti
- Se ha saltato un pasto: distribuisci meglio i macros
- Mantieni ${mealsPerDay} pasti e orari simili
- Dai una motivazione breve all'inizio come campo "motivation"
- Varia rispetto al piano originale

Rispondi SOLO con JSON valido:
{
  "motivation": "frase motivante breve",
  "day": "Piano Adattato — Domani",
  "total_calories": X,
  "total_protein_g": X,
  "total_carbs_g": X,
  "total_fat_g": X,
  "adjustment_reason": "spiegazione breve dell'adattamento",
  "meals": [
    {
      "meal_name": "Colazione",
      "time": "07:30",
      "total_calories": X,
      "total_protein_g": X,
      "total_carbs_g": X,
      "total_fat_g": X,
      "options": [
        {
          "option_name": "Opzione A",
          "foods": [{"name":"","amount":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],
          "total_calories": X,
          "total_protein_g": X,
          "total_carbs_g": X,
          "total_fat_g": X
        },
        {
          "option_name": "Opzione B",
          "foods": [{"name":"","amount":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],
          "total_calories": X,
          "total_protein_g": X,
          "total_carbs_g": X,
          "total_fat_g": X
        }
      ]
    }
  ]
}`;

    const client = new Anthropic({ apiKey: anthropicKey });
    const r = await client.messages.create({ model: MODEL, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] });
    const text = (r.content[0] as { text: string }).text;
    const adapted = extract(text);

    if (!adapted) return NextResponse.json({ error: 'Errore nella generazione del piano adattato' }, { status: 500 });

    return NextResponse.json({ adapted });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as { message?: string })?.message ?? 'Errore interno' }, { status: 500 });
  }
}
