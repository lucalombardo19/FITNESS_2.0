import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, LangGraphFitnessRequest, LangGraphFitnessResponse, NutritionQuery, VectorSearchResponse, NutritionResult, AppSettings } from '../types';
import { DEFAULT_API_URL, DEFAULT_USER_ID, STORAGE_KEYS } from '../constants';

class FitnessAPIService {
  private client: AxiosInstance;
  private baseUrl: string = DEFAULT_API_URL;

  constructor() {
    this.client = axios.create({ baseURL: this.baseUrl, timeout: 120000, headers: { 'Content-Type': 'application/json' } });
    this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (raw) { const s: AppSettings = JSON.parse(raw); this.setBaseUrl(s.apiBaseUrl); }
    } catch { /* use defaults */ }
  }

  setBaseUrl(url: string): void { this.baseUrl = url; this.client.defaults.baseURL = url; }
  getBaseUrl(): string { return this.baseUrl; }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await this.client.get('/v1/nutrition_setup/test_mongo_db/', { timeout: 10000 });
      return { ok: true, message: res.data?.message || 'Connesso' };
    } catch (e: unknown) {
      const err = e as { message?: string };
      return { ok: false, message: err?.message || 'Connessione fallita' };
    }
  }

  async getDatabaseAvailability(): Promise<Record<string, unknown>> {
    const res = await this.client.get('/v1/nutrition_setup/database_availability/');
    return res.data;
  }

  classifyError(e: unknown): string {
    const err = e as { message?: string; code?: string; response?: { status?: number; data?: { detail?: string } } };
    const msg = (err?.message ?? '').toLowerCase();
    const detail = (err?.response?.data?.detail ?? '').toLowerCase();
    const status = err?.response?.status;
    if (msg.includes('401') || status === 401 || detail.includes('api key') || detail.includes('openai')) return 'API_KEY_MISSING';
    if (msg.includes('timeout') || msg.includes('stream idle') || msg.includes('partial response') || err?.code === 'ECONNABORTED') return 'TIMEOUT';
    if (msg.includes('network error') || msg.includes('econnrefused') || msg.includes('enotfound') || err?.code === 'ERR_NETWORK') return 'NETWORK';
    if (status && status >= 500) return 'SERVER_ERROR';
    return 'UNKNOWN';
  }

  buildErrorMessage(e: unknown): string {
    const type = this.classifyError(e);
    switch (type) {
      case 'API_KEY_MISSING': return '🔑 API keys mancanti\n\nConfigura OPENAI_API_KEY nel file .env del backend, poi riavvia con:\n\nmake setup-demo';
      case 'TIMEOUT': return '⏱ Stream timeout\n\nIl server ha impiegato troppo tempo. Accade spesso se:\n• Le API keys non sono valide\n• Il modello o3-mini è sovraccarico\n\nProva con GPT-4o-mini (disattiva o3-mini).';
      case 'NETWORK': return '📡 Backend non raggiungibile\n\nVerifica nelle Impostazioni che l\'URL sia corretto e che Docker sia avviato.';
      case 'SERVER_ERROR': return '🔴 Errore del server\n\nControlla i log con:\n\ndocker compose logs fastapi';
      default: { const err = e as { message?: string }; return `❌ Errore: ${err?.message ?? 'sconosciuto'}`; }
    }
  }

  async generateFitnessPlan(request: LangGraphFitnessRequest): Promise<LangGraphFitnessResponse> {
    try {
      const res = await this.client.post('/v1/langgraph/generate-fitness-plan/', request, {
        timeout: 180000,
        validateStatus: (status) => status < 500,
      });
      if (res.status === 422) throw new Error(`Dati profilo non validi (422): ${JSON.stringify(res.data)}`);
      return res.data;
    } catch (e) {
      throw new Error(this.buildErrorMessage(e));
    }
  }

  async searchNutritionSemantic(query: NutritionQuery): Promise<VectorSearchResponse> {
    const res = await this.client.post('/v1/nutrition_search/search_nutrition_semantic/', query);
    return res.data;
  }

  async searchNutritionHybrid(q: string, limit: number = 10, dietary?: string[]): Promise<{ results: NutritionResult[] }> {
    const res = await this.client.get('/v1/nutrition_search/search_nutrition_hybrid/', { params: { query: q, limit, dietary_restrictions: dietary?.join(',') } });
    return res.data;
  }

  async searchNutritionBasic(query: string, limit: number = 10): Promise<NutritionResult[]> {
    const res = await this.client.get('/v1/nutrition_setup/search_nutrition/', { params: { query, limit } });
    return res.data?.results ?? res.data ?? [];
  }

  async saveProfile(profile: UserProfile): Promise<void> { await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile)); }
  async loadProfile(): Promise<UserProfile | null> { const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE); return raw ? JSON.parse(raw) : null; }
  async saveLastPlan(plan: LangGraphFitnessResponse): Promise<void> { await AsyncStorage.setItem(STORAGE_KEYS.LAST_PLAN, JSON.stringify(plan)); }
  async loadLastPlan(): Promise<LangGraphFitnessResponse | null> { const raw = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PLAN); return raw ? JSON.parse(raw) : null; }
  async saveSettings(settings: AppSettings): Promise<void> { await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings)); this.setBaseUrl(settings.apiBaseUrl); }
  async loadSettings2(): Promise<AppSettings> { const raw = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS); if (raw) return JSON.parse(raw); return { apiBaseUrl: DEFAULT_API_URL, userId: DEFAULT_USER_ID }; }
}

export const fitnessAPI = new FitnessAPIService();
export default fitnessAPI;
