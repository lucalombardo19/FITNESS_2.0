import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

function extract(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function call(client: Anthropic, content: string, maxTokens: number): Promise<string> {
  const r = await client.messages.create({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] });
  return (r.content[0] as { text: string }).text;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const uid = parseInt((session.user as { id?: string }).id ?? '0');
    const row = db.prepare('SELECT profile, anthropic_key FROM user_data WHERE user_id = ?').get(uid) as { profile?: string; anthropic_key?: string } | undefined;

    const anthropicKey = row?.anthropic_key || process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return NextResponse.json({ error: 'Anthropic API key non configurata. Vai su Impostazioni.' }, { status: 401 });

    const body = await req.json();
    const profile = body.profile ?? (row?.profile ? JSON.parse(row.profile) : {});
    const { genMeal, genWorkout } = body;

    const client = new Anthropic({ apiKey: anthropicKey });
    const steps: string[] = [];

    steps.push('✅ Profile Manager: target calcolati');
    const targets = extract(await call(client, `Nutrizionista. Analizza profilo e calcola target. Profilo: ${JSON.stringify(profile)}. JSON ONLY: {"bmr":0,"tdee":0,"target_calories":0,"target_protein_g":0,"target_carbs_g":0,"target_fat_g":0}`, 400)) ?? {};

    let mealPlan = null;
    if (genMeal) {
      steps.push('✅ Meal Planner: piano alimentare generato');
      mealPlan = extract(await call(client, `Nutrizionista italiano. Piano alimentare giornaliero. Target: ${JSON.stringify(targets)}. Obiettivo: ${profile.fitness_goal}. Allergie: ${(profile.allergies ?? []).join(', ') || 'nessuna'}. Preferenze: ${(profile.dietary_preferences ?? []).join(', ') || 'nessuna'}. 5 pasti. Alimenti italiani. JSON ONLY: {"meals":[{"meal_name":"Colazione","time":"07:30","foods":[{"name":"","amount":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}],"total_calories":0,"total_protein_g":0,"total_carbs_g":0,"total_fat_g":0}],"total_daily_calories":0,"total_protein_g":0,"total_carbs_g":0,"total_fat_g":0,"notes":""}`, 3500));
    }

    let workoutPlan = null;
    if (genWorkout) {
      steps.push('✅ Workout Planner: routine progettata');
      workoutPlan = extract(await call(client, `Personal trainer. Programma ${profile.weekly_workout_frequency} gg/sett. Obiettivo: ${profile.fitness_goal}. Attrezzatura: ${(profile.available_equipment ?? ['bodyweight']).join(', ')}. Crea ESATTAMENTE ${profile.weekly_workout_frequency} sessioni. JSON ONLY: {"sessions":[{"day":"Lunedì","focus":"","exercises":[{"name":"","sets":3,"reps":"10-12","rest":"60s","notes":""}],"duration_minutes":45,"notes":""}],"weekly_frequency":${profile.weekly_workout_frequency},"progression_notes":"","notes":""}`, 3500));
    }

    steps.push('✅ Summary Agent: riepilogo finalizzato');
    const summary = await call(client, `Riepilogo motivante 3-4 frasi. Profilo: ${profile.age}aa ${profile.weight_kg}kg obiettivo ${profile.fitness_goal}. Calorie: ${(targets as Record<string,number>).target_calories ?? '?'}/gg. Allenamento: ${profile.weekly_workout_frequency} sessioni/sett. Solo testo.`, 250);

    const plan = { status: 'success', summary, meal_plan: mealPlan, workout_plan: workoutPlan, execution_steps: steps, errors: [], timestamp: new Date().toISOString() };

    db.prepare('UPDATE user_data SET last_plan = ?, updated_at = datetime("now") WHERE user_id = ?').run(JSON.stringify(plan), uid);

    return NextResponse.json(plan);
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    if (err?.status === 401) return NextResponse.json({ error: 'API key Anthropic non valida' }, { status: 401 });
    return NextResponse.json({ error: err?.message ?? 'Errore interno' }, { status: 500 });
  }
}
