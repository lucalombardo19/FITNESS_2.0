export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type FitnessGoal = 'cut' | 'bulk' | 'maintenance' | 'recomp';
export type KcalMode = 'auto' | 'deficit' | 'surplus' | 'manual';

// ─── Preferences ────────────────────────────────────────────────────────────

export interface DietPrefs {
  mealsPerDay: number;
  planDays: number;
  kcalMode: KcalMode;
  targetKcal?: number;
  kcalAdjustment?: number;
}

export interface WorkoutPrefs {
  restSeconds: number;
  sessionMinutes: number;
  intensity: 'light' | 'moderate' | 'intense';
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  age: number;
  weight_kg: number;
  height_cm: number;
  goal_weight_kg?: number;
  activity_level: ActivityLevel;
  fitness_goal: FitnessGoal;
  weekly_workout_frequency: number;
  allergies: string[];
  dietary_preferences: string[];
  available_equipment: string[];
}

// ─── Diet / Meals ─────────────────────────────────────────────────────────────

export interface FoodItem {
  name: string;
  amount: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealOption {
  option_name: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface Meal {
  meal_name: string;
  time?: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  options?: MealOption[];
}

export interface DayPlan {
  day: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  meals: Meal[];
}

export interface MealPlan {
  days?: DayPlan[];
  meals?: Meal[];
  total_daily_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  meals_per_day?: number;
  target_kcal?: number;
  notes?: string;
}

// ─── Workout ──────────────────────────────────────────────────────────────────

export interface ExerciseAlternative {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  weight_suggestion?: string;
  duration?: string;
  rest?: string;
  notes?: string;
  alternatives?: ExerciseAlternative[];
}

export interface ExerciseSetLog {
  reps: number;
  weight_kg?: number;
}

export interface ExerciseLog {
  exercise_name: string;
  session_focus: string;
  date: string;
  sets: ExerciseSetLog[];
  notes?: string;
}

export interface WorkoutSession {
  day: string;
  focus: string;
  exercises: Exercise[];
  duration_minutes?: number;
  rest_between_sets?: number;
  notes?: string;
}

export interface WorkoutPlan {
  sessions: WorkoutSession[];
  weekly_frequency: number;
  progression_notes?: string;
  notes?: string;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface FitnessPlan {
  status: string;
  summary?: string;
  meal_plan?: MealPlan;
  workout_plan?: WorkoutPlan;
  execution_steps?: string[];
  errors?: string[];
  timestamp?: string;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface NutritionResult {
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  similarity_score?: number;
}
