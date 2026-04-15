import re
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import anthropic

app = FastAPI(title="AI Fitness Planner - Claude Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = "claude-sonnet-4-6"


def get_client() -> anthropic.Anthropic:
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        raise ValueError("ANTHROPIC_API_KEY non configurata nel file .env")
    return anthropic.Anthropic(api_key=key)


def extract_json(text: str) -> Optional[Dict]:
    """Extract first JSON object from text, even if surrounded by prose."""
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    return None


# ── PYDANTIC MODELS ──────────────────────────────────────────────────────────

class FitnessRequest(BaseModel):
    user_id: str
    user_profile: Optional[Dict] = None
    meal_preferences: Optional[Dict] = None
    workout_preferences: Optional[Dict] = None
    generate_meal_plan: bool = True
    generate_workout_plan: bool = True
    use_o3_mini: bool = False
    use_full_database: bool = False


class NutritionQuery(BaseModel):
    query: str
    dietary_restrictions: Optional[List[str]] = None
    macro_goals: Optional[Dict[str, float]] = None
    limit: int = 10
    similarity_threshold: float = 0.7


# ── AGENTS ───────────────────────────────────────────────────────────────────

def agent_profile(client: anthropic.Anthropic, profile: Dict) -> Dict:
    """Agent 1 — Profile Manager: calcola target nutrizionali."""
    resp = client.messages.create(
        model=MODEL,
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": f"""Sei un nutrizionista esperto. Analizza il profilo e calcola i target.

Profilo: {json.dumps(profile, ensure_ascii=False)}

Rispondi SOLO con JSON valido:
{{
  "bmr": 1800,
  "tdee": 2400,
  "target_calories": 2000,
  "target_protein_g": 150,
  "target_carbs_g": 200,
  "target_fat_g": 70,
  "analysis": "breve analisi personalizzata"
}}"""
        }]
    )
    return extract_json(resp.content[0].text) or {}


def agent_meal_planner(client: anthropic.Anthropic, profile: Dict, targets: Dict) -> Dict:
    """Agent 2 — Meal Planner: crea piano alimentare giornaliero."""
    allergies = ", ".join(profile.get("allergies", [])) or "nessuna"
    dietary = ", ".join(profile.get("dietary_preferences", [])) or "nessuna"
    goal = profile.get("fitness_goal", "maintenance")
    kcal = targets.get("target_calories", 2000)

    resp = client.messages.create(
        model=MODEL,
        max_tokens=3500,
        messages=[{
            "role": "user",
            "content": f"""Sei un nutrizionista italiano. Crea un piano alimentare giornaliero completo.

Target calorico: {kcal} kcal
Proteine target: {targets.get("target_protein_g", 150)}g
Carboidrati target: {targets.get("target_carbs_g", 200)}g
Grassi target: {targets.get("target_fat_g", 70)}g
Obiettivo: {goal}
Allergie/Intolleranze: {allergies}
Preferenze dietetiche: {dietary}

Includi 5 pasti: Colazione, Spuntino mattina, Pranzo, Spuntino pomeriggio, Cena.
Usa alimenti reali e accessibili in Italia.

Rispondi SOLO con JSON valido:
{{
  "meals": [
    {{
      "meal_name": "Colazione",
      "time": "07:30",
      "foods": [
        {{"name": "Avena", "amount": "80g", "calories": 300, "protein_g": 10, "carbs_g": 55, "fat_g": 6}}
      ],
      "total_calories": 400,
      "total_protein_g": 20,
      "total_carbs_g": 50,
      "total_fat_g": 10
    }}
  ],
  "total_daily_calories": {kcal},
  "total_protein_g": {targets.get("target_protein_g", 150)},
  "total_carbs_g": {targets.get("target_carbs_g", 200)},
  "total_fat_g": {targets.get("target_fat_g", 70)},
  "notes": "consigli nutrizionali personalizzati"
}}"""
        }]
    )
    return extract_json(resp.content[0].text) or {}


def agent_workout_planner(client: anthropic.Anthropic, profile: Dict) -> Dict:
    """Agent 3 — Workout Planner: crea programma di allenamento."""
    equipment = ", ".join(profile.get("available_equipment", ["bodyweight"]))
    frequency = profile.get("weekly_workout_frequency", 3)
    goal = profile.get("fitness_goal", "maintenance")
    activity = profile.get("activity_level", "moderately_active")

    resp = client.messages.create(
        model=MODEL,
        max_tokens=3500,
        messages=[{
            "role": "user",
            "content": f"""Sei un personal trainer esperto. Crea un programma di allenamento settimanale.

Obiettivo: {goal}
Frequenza: {frequency} giorni/settimana
Attrezzatura disponibile: {equipment}
Livello di attività: {activity}

Crea ESATTAMENTE {frequency} sessioni usando SOLO l'attrezzatura disponibile.

Rispondi SOLO con JSON valido:
{{
  "sessions": [
    {{
      "day": "Lunedì",
      "focus": "Petto e Tricipiti",
      "exercises": [
        {{"name": "Panca Piana", "sets": 4, "reps": "8-10", "rest": "90s", "notes": "busto fermo"}}
      ],
      "duration_minutes": 50,
      "notes": "note sessione"
    }}
  ],
  "weekly_frequency": {frequency},
  "progression_notes": "aumenta il carico del 2.5% ogni settimana",
  "notes": "note generali sul programma"
}}"""
        }]
    )
    return extract_json(resp.content[0].text) or {}


def agent_summary(client: anthropic.Anthropic, profile: Dict, meal: Dict, workout: Dict) -> str:
    """Agent 4 — Summary Agent: genera riepilogo piano."""
    resp = client.messages.create(
        model=MODEL,
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"""Scrivi un riepilogo motivante e personalizzato del piano fitness in 3-4 frasi.

Profilo: {profile.get("age")} anni, {profile.get("weight_kg")}kg, {profile.get("height_cm")}cm
Obiettivo: {profile.get("fitness_goal")}
Piano alimentare: {meal.get("total_daily_calories", "?")} kcal/giorno
Allenamento: {workout.get("weekly_frequency", "?")} sessioni/settimana

Rispondi solo con il testo del riepilogo, diretto e motivante."""
        }]
    )
    return resp.content[0].text.strip()


# ── ROUTES ───────────────────────────────────────────────────────────────────

@app.get("/v1/nutrition_setup/test_mongo_db/")
async def test_connection():
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "message": "ANTHROPIC_API_KEY mancante nel file .env"}
        )
    return {"status": "ok", "message": "Claude Backend operativo ✓"}


@app.get("/v1/nutrition_setup/database_availability/")
async def database_availability():
    key = os.getenv("ANTHROPIC_API_KEY", "")
    return {
        "backend_type": "claude_direct",
        "model": MODEL,
        "claude_api": "configured" if key else "missing_key",
        "nutrition_search": "claude_knowledge",
        "meal_planning": "claude_agent",
        "workout_planning": "claude_agent",
    }


@app.post("/v1/langgraph/generate-fitness-plan/")
async def generate_fitness_plan(request: FitnessRequest):
    try:
        client = get_client()
        profile = request.user_profile or {}
        execution_steps: List[str] = []
        errors: List[str] = []

        # Agent 1 — Profile Manager
        execution_steps.append("✅ Profile Manager: analisi obiettivi completata")
        targets = agent_profile(client, profile)

        meal_plan = None
        workout_plan = None

        # Agent 2 — Meal Planner
        if request.generate_meal_plan:
            execution_steps.append("✅ Meal Planner: piano alimentare generato")
            meal_plan = agent_meal_planner(client, profile, targets)
            if not meal_plan:
                errors.append("Meal plan non generato correttamente")

        # Agent 3 — Workout Planner
        if request.generate_workout_plan:
            execution_steps.append("✅ Workout Planner: routine progettata")
            workout_plan = agent_workout_planner(client, profile)
            if not workout_plan:
                errors.append("Workout plan non generato correttamente")

        # Agent 4 — Summary
        execution_steps.append("✅ Summary Agent: riepilogo finalizzato")
        summary = agent_summary(client, profile, meal_plan or {}, workout_plan or {})

        return {
            "status": "success",
            "user_profile": profile,
            "meal_plan": meal_plan,
            "workout_plan": workout_plan,
            "summary": summary,
            "execution_steps": execution_steps,
            "errors": errors,
            "timestamp": datetime.now().isoformat(),
        }

    except ValueError as e:
        return JSONResponse(status_code=401, content={"detail": str(e)})
    except anthropic.AuthenticationError:
        return JSONResponse(status_code=401, content={"detail": "API key Anthropic non valida"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Errore interno: {str(e)}"})


@app.post("/v1/nutrition_search/search_nutrition_semantic/")
async def search_nutrition_semantic(query: NutritionQuery):
    try:
        client = get_client()
        dietary = ", ".join(query.dietary_restrictions or []) or "nessuna"

        resp = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""Sei un esperto di nutrizione. Trova {query.limit} alimenti per la ricerca: "{query.query}".
Restrizioni dietetiche: {dietary}.
Dati nutrizionali per 100g. Includi alimenti comuni in Italia.

Rispondi SOLO con JSON:
{{
  "results": [
    {{
      "name": "nome alimento",
      "brand": null,
      "calories_per_100g": 150,
      "protein_g": 10,
      "carbs_g": 20,
      "fat_g": 5,
      "fiber_g": 2,
      "macro_category": "proteine/carboidrati/grassi",
      "similarity_score": 0.95
    }}
  ]
}}"""
            }]
        )

        data = extract_json(resp.content[0].text) or {}
        results = data.get("results", [])
        return {"results": results, "total_found": len(results), "processing_time_ms": 0}

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.get("/v1/nutrition_search/search_nutrition_hybrid/")
async def search_nutrition_hybrid(
    query: str = Query(...),
    limit: int = 10,
    dietary_restrictions: str = "",
):
    try:
        client = get_client()
        dietary = dietary_restrictions or "nessuna"

        resp = client.messages.create(
            model=MODEL,
            max_tokens=1500,
            messages=[{
                "role": "user",
                "content": f"""Trova {limit} alimenti per "{query}". Restrizioni: {dietary}.
JSON: {{"results": [{{"name": "", "calories_per_100g": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0, "similarity_score": 0.9}}]}}
Dati per 100g, alimenti italiani."""
            }]
        )

        data = extract_json(resp.content[0].text) or {}
        return {"results": data.get("results", [])}

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.get("/v1/nutrition_setup/search_nutrition/")
async def search_nutrition_basic(query: str = Query(...), limit: int = 10):
    try:
        client = get_client()

        resp = client.messages.create(
            model=MODEL,
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""Elenca {limit} alimenti per "{query}".
JSON: {{"results": [{{"name": "", "calories_per_100g": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0}}]}}"""
            }]
        )

        data = extract_json(resp.content[0].text) or {}
        return {"results": data.get("results", [])}

    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": str(e)})


@app.get("/")
async def root():
    return {"message": "AI Fitness Planner - Claude Backend", "docs": "/docs"}
