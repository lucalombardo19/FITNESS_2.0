import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';
import type { DietPrefs, WorkoutPrefs, ExerciseLog } from '@/lib/types';

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

function calcKcal(profile: Record<string, number>, dietPrefs: DietPrefs, tdee: number): number {
  if (dietPrefs.kcalMode === 'manual' && dietPrefs.targetKcal) return dietPrefs.targetKcal;
  if (dietPrefs.kcalMode === 'deficit') return Math.max(1200, tdee - (dietPrefs.kcalAdjustment ?? 500));
  if (dietPrefs.kcalMode === 'surplus') return tdee + (dietPrefs.kcalAdjustment ?? 300);
  // auto: based on goal
  if (profile.fitness_goal === 'cut') return Math.max(1200, tdee - 400);
  if (profile.fitness_goal === 'bulk') return tdee + 300;
  return tdee;
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
    const dietPrefs: DietPrefs = body.dietPrefs ?? { mealsPerDay: 4, planDays: 3, kcalMode: 'auto' };
    const workoutPrefs: WorkoutPrefs = body.workoutPrefs ?? { restSeconds: 90, sessionMinutes: 60, intensity: 'moderate' };

    // Load recent workout history for progressive overload
    const workoutHistory = db.prepare(`
      SELECT exercise_name, session_focus, date, sets_json FROM workout_log
      WHERE user_id = ? ORDER BY date DESC LIMIT 30
    `).all(uid) as { exercise_name: string; session_focus: string; date: string; sets_json: string }[];
    const recentLogs: ExerciseLog[] = workoutHistory.map(r => ({
      exercise_name: r.exercise_name,
      session_focus: r.session_focus,
      date: r.date,
      sets: JSON.parse(r.sets_json),
    }));

    const client = new Anthropic({ apiKey: anthropicKey });
    const steps: string[] = [];

    // ── Step 1: Calculate targets ─────────────────────────────────────────────
    steps.push('✅ Profile Manager: target calcolati');
    const activityMult: Record<string, number> = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
    const bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
    const tdee = Math.round(bmr * (activityMult[profile.activity_level] ?? 1.55));
    const targetKcal = calcKcal(profile, dietPrefs, tdee);
    const protG = Math.round(profile.weight_kg * 2.2);
    const fatG = Math.round((targetKcal * 0.25) / 9);
    const carbG = Math.round((targetKcal - protG * 4 - fatG * 9) / 4);

    // ── Step 2: Meal Plan ─────────────────────────────────────────────────────
    let mealPlan = null;
    if (genMeal) {
      steps.push(`✅ Meal Planner: piano ${dietPrefs.planDays} giorni × ${dietPrefs.mealsPerDay} pasti generato`);
      const mealPrompt = `Sei un nutrizionista professionista italiano. Crea un piano alimentare DETTAGLIATO e VARIO.

PARAMETRI OBBLIGATORI:
- Giorni: ${dietPrefs.planDays}
- Pasti per giorno: ${dietPrefs.mealsPerDay}
- Calorie target: ${targetKcal} kcal/giorno (±30 kcal tolleranza)
- Proteine: ${protG}g | Carboidrati: ${carbG}g | Grassi: ${fatG}g
- Obiettivo: ${profile.fitness_goal}
- Allergie: ${(profile.allergies ?? []).join(', ') || 'nessuna'}
- Preferenze: ${(profile.dietary_preferences ?? []).join(', ') || 'nessuna'}

REGOLE FERREE:
1. Ogni giorno ha ESATTAMENTE ${dietPrefs.mealsPerDay} pasti
2. Ogni giorno totalizza ${targetKcal} kcal (±30)
3. Ogni pasto ha 2 opzioni alternative (cibi diversi, calorie simili ±20 kcal)
4. Varia i pasti tra i giorni — niente ripetizioni identiche
5. Usa alimenti italiani/mediterranei con grammature in grammi
6. Includi orari realistici adatti al numero di pasti
7. Proteine elevate, alimenti sazianti, gusto reale

Rispondi SOLO con JSON valido (niente testo prima o dopo):
{
  "days": [
    {
      "day": "Giorno 1",
      "total_calories": ${targetKcal},
      "total_protein_g": ${protG},
      "total_carbs_g": ${carbG},
      "total_fat_g": ${fatG},
      "meals": [
        {
          "meal_name": "Colazione",
          "time": "07:30",
          "total_calories": 450,
          "total_protein_g": 35,
          "total_carbs_g": 40,
          "total_fat_g": 12,
          "options": [
            {
              "option_name": "Opzione A",
              "foods": [{"name":"Fiocchi d'avena","amount":"80g","calories":290,"protein_g":10,"carbs_g":54,"fat_g":6},{"name":"Albumi","amount":"3 (90g)","calories":47,"protein_g":10,"carbs_g":0,"fat_g":0}],
              "total_calories": 450,
              "total_protein_g": 35,
              "total_carbs_g": 40,
              "total_fat_g": 12
            },
            {
              "option_name": "Opzione B",
              "foods": [{"name":"Yogurt greco 0%","amount":"200g","calories":120,"protein_g":20,"carbs_g":6,"fat_g":0}],
              "total_calories": 440,
              "total_protein_g": 34,
              "total_carbs_g": 38,
              "total_fat_g": 11
            }
          ]
        }
      ]
    }
  ],
  "meals_per_day": ${dietPrefs.mealsPerDay},
  "target_kcal": ${targetKcal},
  "total_daily_calories": ${targetKcal},
  "total_protein_g": ${protG},
  "total_carbs_g": ${carbG},
  "total_fat_g": ${fatG},
  "notes": "consigli brevi"
}`;
      mealPlan = extract(await call(client, mealPrompt, 8000));
    }

    // ── Step 3: Workout Plan ──────────────────────────────────────────────────
    let workoutPlan = null;
    if (genWorkout) {
      steps.push('✅ Workout Planner: routine personalizzata generata');
      const historyStr = recentLogs.length > 0
        ? `\nSTORICO ALLENAMENTI RECENTI (usa per progressive overload):\n${JSON.stringify(recentLogs.slice(0, 15), null, 2)}`
        : '\nNessuno storico — crea piano di partenza adatto al livello.';

      const workoutPrompt = `Sei un personal trainer esperto. Crea un programma di allenamento DETTAGLIATO e PROGRESSIVO.

PARAMETRI:
- Sessioni/settimana: ${profile.weekly_workout_frequency}
- Durata sessione: ${workoutPrefs.sessionMinutes} minuti
- Riposo tra le serie: ${workoutPrefs.restSeconds} secondi
- Intensità: ${workoutPrefs.intensity}
- Obiettivo: ${profile.fitness_goal}
- Attrezzatura: ${(profile.available_equipment ?? ['bodyweight']).join(', ')}
- Peso corporeo: ${profile.weight_kg}kg${historyStr}

REGOLE:
1. Crea ESATTAMENTE ${profile.weekly_workout_frequency} sessioni
2. Ogni sessione dura ${workoutPrefs.sessionMinutes} minuti
3. Riposo tra serie: ${workoutPrefs.restSeconds}s (includi nel campo rest)
4. Ogni esercizio ha 1-2 alternative per chi non può eseguirlo
5. Suggerisci peso iniziale/range realistico per ogni esercizio
6. Se c'è storico allenamenti, aumenta leggermente pesi/volume per progressive overload
7. Esercizi concreti con serie, ripetizioni, peso suggerito

Rispondi SOLO con JSON (niente testo prima o dopo):
{
  "sessions": [
    {
      "day": "Lunedì",
      "focus": "Petto e Tricipiti",
      "duration_minutes": ${workoutPrefs.sessionMinutes},
      "rest_between_sets": ${workoutPrefs.restSeconds},
      "exercises": [
        {
          "name": "Panca Piana",
          "sets": 4,
          "reps": "8-10",
          "weight_suggestion": "60-70kg o 60% del massimale",
          "rest": "${workoutPrefs.restSeconds}s",
          "notes": "scapole adducte, controllo nella discesa",
          "alternatives": [
            {"name": "Panca con manubri", "sets": 4, "reps": "10-12", "notes": "stesso angolo, più libertà di movimento"},
            {"name": "Flessioni con zavorra", "sets": 4, "reps": "12-15", "notes": "alternativa a corpo libero"}
          ]
        }
      ],
      "notes": "note sessione"
    }
  ],
  "weekly_frequency": ${profile.weekly_workout_frequency},
  "progression_notes": "come aumentare carichi progressivamente",
  "notes": "consigli generali"
}`;
      workoutPlan = extract(await call(client, workoutPrompt, 6000));
    }

    // ── Step 4: Summary ───────────────────────────────────────────────────────
    steps.push('✅ Summary Agent: riepilogo finalizzato');
    const summary = await call(client,
      `Riepilogo motivante 3-4 frasi. Piano: ${dietPrefs.planDays} giorni, ${dietPrefs.mealsPerDay} pasti/giorno, ${targetKcal} kcal. Profilo: ${profile.age}aa ${profile.weight_kg}kg obiettivo ${profile.fitness_goal}. Allenamento: ${profile.weekly_workout_frequency} sessioni/sett da ${workoutPrefs.sessionMinutes}min. Solo testo.`,
      300);

    const plan = {
      status: 'success', summary,
      meal_plan: mealPlan,
      workout_plan: workoutPlan,
      execution_steps: steps,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO user_data (user_id, last_plan, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        last_plan  = excluded.last_plan,
        updated_at = excluded.updated_at
    `).run(uid, JSON.stringify(plan));

    return NextResponse.json(plan);
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    if (err?.status === 401) return NextResponse.json({ error: 'API key Anthropic non valida' }, { status: 401 });
    return NextResponse.json({ error: err?.message ?? 'Errore interno' }, { status: 500 });
  }
}
