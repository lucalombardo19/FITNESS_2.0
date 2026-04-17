# 🏋️ AI Fitness Planner — Mobile App

App mobile React Native (Expo) per piani personalizzati di fitness e nutrizione, basata sul backend [zen-apps/ai-fitness-planner](https://github.com/zen-apps/ai-fitness-planner).

## Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| App Mobile | React Native + Expo (TypeScript) |
| Navigazione | React Navigation v7 (Bottom Tabs) |
| HTTP Client | Axios |
| Storage | AsyncStorage |
| AI Backend | FastAPI + LangGraph + GPT-4 |
| Database | MongoDB + 5000 alimenti USDA |
| Ricerca | FAISS Vector Search |

## Schermate

| Schermata | Descrizione |
|---|---|
| 🏠 Home | Dashboard con stato profilo, ultimo piano e azioni rapide |
| 👤 Profilo | Setup completo: dati fisici, obiettivi, attrezzatura, preferenze |
| ⚡ Piano AI | Genera piano alimentare + allenamento con LangGraph multi-agent |
| 🔍 Cerca | Ricerca alimenti con modalità semantica, ibrida o base |
| ⚙️ Impostazioni | Configurazione URL backend, test connessione, info app |

## Come avviare

### 1. Backend

```bash
git clone https://github.com/zen-apps/ai-fitness-planner
cd ai-fitness-planner
cp .env.example .env   # Aggiungi OPENAI_API_KEY e LANGCHAIN_API_KEY
make setup-demo        # Docker: avvia tutto su porta 1015
```

### 2. App Mobile

```bash
npm install
npm start
```

Scansiona il QR con **Expo Go** (iOS/Android).

### 3. Configurazione connessione

Nella schermata ⚙️ Impostazioni, inserisci l'IP del tuo PC:
- LAN: `http://192.168.x.x:1015`
- Android Emulator: `http://10.0.2.2:1015`

## Errore "Stream idle timeout"

Questo errore appare quando le API keys OpenAI non sono configurate nel backend.
Vedi la schermata ⚙️ Piano AI per i passi di risoluzione.
