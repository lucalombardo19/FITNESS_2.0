export const DEFAULT_API_URL = 'http://localhost:1015';
export const DEFAULT_USER_ID = 'mobile_user_001';

export const STORAGE_KEYS = {
  USER_PROFILE: '@fitness_user_profile',
  APP_SETTINGS: '@fitness_app_settings',
  LAST_PLAN: '@fitness_last_plan',
  NUTRITION_TARGETS: '@fitness_nutrition_targets',
} as const;

export const COLORS = {
  primary: '#6C63FF',
  primaryDark: '#4B44CC',
  primaryLight: '#A09CFF',
  secondary: '#FF6584',
  accent: '#43D9AD',
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceVariant: '#252542',
  border: '#2E2E50',
  text: '#FFFFFF',
  textSecondary: '#9494B8',
  textMuted: '#5C5C7A',
  success: '#43D9AD',
  warning: '#FFB347',
  error: '#FF6584',
  cardBg: '#16213E',
} as const;

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentario', description: 'Poco o nessun esercizio' },
  { value: 'lightly_active', label: 'Leggermente attivo', description: '1-3 gg/settimana' },
  { value: 'moderately_active', label: 'Moderatamente attivo', description: '3-5 gg/settimana' },
  { value: 'very_active', label: 'Molto attivo', description: '6-7 gg/settimana' },
  { value: 'extra_active', label: 'Estremamente attivo', description: 'Lavoro fisico intenso' },
] as const;

export const FITNESS_GOALS = [
  { value: 'cut', label: 'Definizione', icon: '🔥', description: 'Perdere grasso mantenendo massa' },
  { value: 'bulk', label: 'Massa', icon: '💪', description: 'Aumentare massa muscolare' },
  { value: 'maintenance', label: 'Mantenimento', icon: '⚖️', description: 'Mantenere il peso attuale' },
  { value: 'recomp', label: 'Ricomposizione', icon: '🔄', description: 'Perdere grasso e guadagnare muscoli' },
] as const;

export const ALLERGIES_OPTIONS = ['dairy', 'gluten', 'nuts', 'shellfish', 'eggs', 'soy'];
export const DIETARY_PREFERENCES = ['vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'low_carb'];
export const EQUIPMENT_OPTIONS = ['bodyweight', 'dumbbells', 'barbell', 'resistance_bands', 'pull_up_bar', 'gym_access'];

export const EQUIPMENT_LABELS: Record<string, string> = {
  bodyweight: 'A corpo libero', dumbbells: 'Manubri', barbell: 'Bilanciere',
  resistance_bands: 'Elastici', pull_up_bar: 'Sbarra trazione', gym_access: 'Accesso palestra',
};

export const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'Vegetariano', vegan: 'Vegano', keto: 'Chetogenica',
  paleo: 'Paleo', mediterranean: 'Mediterranea', low_carb: 'Low Carb',
};

export const ALLERGY_LABELS: Record<string, string> = {
  dairy: 'Latticini', gluten: 'Glutine', nuts: 'Frutta secca',
  shellfish: 'Crostacei', eggs: 'Uova', soy: 'Soia',
};
