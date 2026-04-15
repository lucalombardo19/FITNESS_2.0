import axios from 'axios';
import { UserProfile, LangGraphFitnessResponse } from '../types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

function buildPrompt(profile: UserProfile, genMeal: boolean, genWorkout: boolean): string {
  const goalMap: Record<string, string> = {
    cut: 'definizione (ridurre grasso mantenendo muscoli)',
    bulk: 'aumento massa muscolare',
    maintenance: 'mantenimento del peso',
    recomp: 'ricomposizione corporea (perdere grasso e guadagnare muscoli)',
  };
  const activityMap: Record<string, string> = {
    sedentary: 'sedentario (poco o nessun esercizio)',
    lightly_active: 'leggermente attivo (1-3 gg/sett)',
    moderately_active: 'moderatamente attivo (3-5 gg/sett)',
    very_active: 'molto attivo (6-7 gg/sett)',
    extra_active: 'estremamente attivo (lavoro fisico)',
  };

  const goal = goalMap[profile.fitness_goal] ?? profile.fitness_goal;
  const activity = activityMap[profile.activity_level] ?? profile.activity_level;

  const mealSchema = genMeal ? `
  "meal_plan": {
    "meals": [
      {
        "meal_name": "Colazione",
        "time": "07:30",
        "foods": [
          { "name": "nome alimento", "amount": "quantità (es: 100g)", "calories": 300, "protein_g": 20, "carbs_g": 30, "fat_g": 8 }
        ],
        "total_calories": 400,
        "total_protein_g": 25,
        "total_carbs_g": 40,
        "total_fat_g": 10
      }
    ],
    "total_daily_calories": 2000,
    "total_protein_g": 150,
    "total_carbs_g": 200,
    "total_fat_g": 70,
    "notes": "consigli nutrizionali personalizzati"
  },` : '';

  const workoutSchema = genWorkout ? `
  "workout_plan": {
    "sessions": [
      {
        "day": "Lunedì",
        "focus": "Petto e Tricipiti",
        "exercises": [
          { "name": "Panca Piana", "sets": 4, "reps": "8-10", "rest": "90s", "notes": "nota opzionale" }
        ],
        "duration_minutes": 50,
        "notes": "note sessione"
      }
    ],
    "weekly_frequency": ${profile.weekly_workout_frequency},
    "progression_notes": "come progredire nelle settimane",
    "notes": "note generali sul programma"
  },` : '';

  return `Sei un esperto nutrizionista e personal trainer italiano. Genera un piano fitness completo e personalizzato.

PROFILO UTENTE:
- Età: ${profile.age} anni
- Peso: ${profile.weight_kg} kg
- Altezza: ${profile.height_cm} cm
- Obiettivo: ${goal}
- Livello attività: ${activity}
- Frequenza allenamenti: ${profile.weekly_workout_frequency} giorni/settimana
- Preferenze dietetiche: ${profile.dietary_preferences.length ? profile.dietary_preferences.join(', ') : 'nessuna'}
- Allergie/Intolleranze: ${profile.allergies.length ? profile.allergies.join(', ') : 'nessuna'}
- Attrezzatura disponibile: ${profile.available_equipment.join(', ')}

ISTRUZIONI:
1. Calcola il fabbisogno calorico reale con formula Mifflin-St Jeor
2. Distribuisci i macros in modo ottimale per l'obiettivo
3. Suggerisci alimenti reali e accessibili in Italia
4. Il piano allenamento deve usare SOLO l'attrezzatura disponibile
5. Rispetta allergie e preferenze dietetiche
6. Rispondi ESCLUSIVAMENTE con JSON valido (nessun testo fuori dal JSON, nessun markdown)

JSON DA RESTITUIRE:
{
  "status": "success",
  "summary": "riepilogo personalizzato di 3-4 frasi che spiega il piano e il ragionamento dietro le scelte",${mealSchema}${workoutSchema}
  "timestamp": "${new Date().toISOString()}"
}`;
}

export async function generatePlanWithClaude(
  apiKey: string,
  profile: UserProfile,
  genMeal: boolean,
  genWorkout: boolean,
  onStep?: (step: string) => void,
): Promise<LangGraphFitnessResponse> {
  onStep?.('🤖 Connessione a Claude AI...');

  const response = await axios.post(
    CLAUDE_API_URL,
    {
      model: CLAUDE_MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: buildPrompt(profile, genMeal, genWorkout) }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 90000,
    },
  );

  onStep?.('📊 Elaborazione risposta...');

  const text: string = response.data?.content?.[0]?.text ?? '';
  if (!text) throw new Error('Risposta Claude vuota. Riprova.');

  // Extract JSON even if there's surrounding text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { status: 'success', summary: text, timestamp: new Date().toISOString() };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as LangGraphFitnessResponse;
    return parsed;
  } catch {
    return { status: 'success', summary: text, timestamp: new Date().toISOString() };
  }
}
