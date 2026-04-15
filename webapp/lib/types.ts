export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type FitnessGoal = 'cut' | 'bulk' | 'maintenance' | 'recomp';

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

export interface FoodItem {
  name: string;
  amount: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Meal {
  meal_name: string;
  time?: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
}

export interface MealPlan {
  meals: Meal[];
  total_daily_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  notes?: string;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  rest?: string;
  notes?: string;
}

export interface WorkoutSession {
  day: string;
  focus: string;
  exercises: Exercise[];
  duration_minutes?: number;
  notes?: string;
}

export interface WorkoutPlan {
  sessions: WorkoutSession[];
  weekly_frequency: number;
  progression_notes?: string;
  notes?: string;
}

export interface FitnessPlan {
  status: string;
  summary?: string;
  meal_plan?: MealPlan;
  workout_plan?: WorkoutPlan;
  execution_steps?: string[];
  errors?: string[];
  timestamp?: string;
}

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
