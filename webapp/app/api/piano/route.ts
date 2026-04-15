import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

function extract(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function callClaude(client: Anthropic, prompt: string, maxTokens: number): Promise<string> {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return (r.content[0] as { text: string }).text;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile, genMeal, genWorkout, apiKey } = body;

    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) return NextResponse.json({ error: 'API key mancante' }, { status: 401 });

    const client = new Anthropic({ apiKey: key });
    const steps: string[] = [];

    // Agent 1 — Profile
    steps.push('✅ Profile Manager: target nutrizionali calcolati');
    const targetsRaw = await callClaude(client, `
Nutrizionista esperto. Analizza profilo e calcola target.
Profilo: ${JSON.stringify(profile)}
JSON ONLY: {"bmr":0,"tdee":0,"target_calories":0,"target_protein_g":0,"target_carbs_g":0,"target_fat_g":0}`, 400);
    const targets = extract(targetsRaw) ?? {};

    // Agent 2 — Meal
    let mealPlan = null;
    if (genMeal) {
      steps.push('✅ Meal Planner: piano alimentare generato');
      const mealRaw = await callClaude(client, `
Nutrizionista italiano. Piano alimentare giornaliero.
Target: ${JSON.stringify(targets)}
Obiettivo: ${profile.fitness_goal}
Allergie: ${(profile.allergies ?? []).join(', ') || 'nessuna'}
Preferenze: ${(profile.dietary_preferences ?? []).join(', ') || 'nessuna'}
5 pasti (Colazione, Spuntino, Pranzo, Spuntino, Cena). Alimenti italiani reali.
JSON ONLY:
{"meals":[{"meal_name":"Colazione","time":"07:30","foods":[{"name":"","amount":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],"total_calories":0,"total_protein_g":0,"total_carbs_g":0,"total_fat_g":0}],"total_daily_calories":0,"total_protein_g":0,"total_carbs_g":0,"total_fat_g":0,"notes":""}`, 3500);
      mealPlan = extract(mealRaw);
    }

    // Agent 3 — Workout
    let workoutPlan = null;
    if (genWorkout) {
      steps.push('✅ Workout Planner: routine progettata');
      const wRaw = await callClaude(client, `
Personal trainer. Programma allenamento settimanale.
Obiettivo: ${profile.fitness_goal}
Frequenza: ${profile.weekly_workout_frequency} gg/sett
Attrezzatura: ${(profile.available_equipment ?? ['bodyweight']).join(', ')}
Livello: ${profile.activity_level}
Crea ESATTAMENTE ${profile.weekly_workout_frequency} sessioni con SOLO l'attrezzatura disponibile.
JSON ONLY:
{"sessions":[{"day":"Lunedì","focus":"","exercises":[{"name":"","sets":3,"reps":"10-12","rest":"60s","notes":""}],"duration_minutes":45,"notes":""}],"weekly_frequency":${profile.weekly_workout_frequency},"progression_notes":"","notes":""}`, 3500);
      workoutPlan = extract(wRaw);
    }

    // Agent 4 — Summary
    steps.push('✅ Summary Agent: riepilogo finalizzato');
    const summary = await callClaude(client, `
Scrivi riepilogo motivante 3-4 frasi del piano fitness.
Profilo: ${profile.age}aa ${profile.weight_kg}kg, obiettivo: ${profile.fitness_goal}
Calorie: ${(targets as Record<string,number>).target_calories ?? '?'} kcal/gg
Allenamento: ${profile.weekly_workout_frequency} sessioni/sett
Solo testo, niente JSON.`, 250);

    return NextResponse.json({
      status: 'success',
      summary,
      meal_plan: mealPlan,
      workout_plan: workoutPlan,
      execution_steps: steps,
      errors: [],
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    if (err?.status === 401) return NextResponse.json({ error: 'API key non valida' }, { status: 401 });
    return NextResponse.json({ error: err?.message ?? 'Errore interno' }, { status: 500 });
  }
}
