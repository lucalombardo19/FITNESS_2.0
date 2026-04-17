export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type FitnessGoal = 'cut' | 'bulk' | 'maintenance' | 'recomp';
export type UnitSystem = 'metric' | 'imperial';

export interface UserProfile {
  user_id: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  fitness_goal: FitnessGoal;
  weekly_workout_frequency: number;
  allergies: string[];
  dietary_preferences: string[];
  available_equipment: string[];
}

export interface NutritionTargets {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
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

export interface LangGraphFitnessRequest {
  user_id: string;
  user_profile?: Partial<UserProfile>;
  meal_preferences?: Record<string, unknown>;
  workout_preferences?: Record<string, unknown>;
  generate_meal_plan?: boolean;
  generate_workout_plan?: boolean;
  use_o3_mini?: boolean;
  use_full_database?: boolean;
}

export interface LangGraphFitnessResponse {
  status: string;
  user_profile?: UserProfile;
  meal_plan?: MealPlan | string;
  workout_plan?: WorkoutPlan | string;
  summary?: string;
  execution_steps?: string[];
  errors?: string[];
  timestamp?: string;
}

export interface NutritionQuery {
  query: string;
  dietary_restrictions?: string[];
  macro_goals?: Record<string, number>;
  limit?: number;
  similarity_threshold?: number;
}

export interface NutritionResult {
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  macro_category?: string;
  similarity_score?: number;
}

export interface VectorSearchResponse {
  results: NutritionResult[];
  processing_time_ms?: number;
  total_found?: number;
}

export interface AppSettings {
  apiBaseUrl: string;
  userId: string;
  anthropicApiKey?: string;
}

export type RootTabParamList = {
  Home: undefined;
  Profile: undefined;
  Plan: undefined;
  Search: undefined;
  Settings: undefined;
};
