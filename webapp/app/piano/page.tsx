'use client';
import { useState, useEffect } from 'react';
import type {
  FitnessPlan, Meal, MealOption, WorkoutSession, MealPlan, WorkoutPlan,
  DayPlan, KcalMode, ExerciseAlternative
} from '@/lib/types';
import MacroBar from '@/components/MacroBar';

type Tab = 'overview' | 'meals' | 'workout';
type AdaptedDay = DayPlan & { motivation?: string; adjustment_reason?: string };

export default function Piano() {
  // ─── Core ──────────────────────────────────────────────────────────────────
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [genMeal, setGenMeal] = useState(true);
  const [genWorkout, setGenWorkout] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  // ─── Yazio ─────────────────────────────────────────────────────────────────
  const [yazioConnected, setYazioConnected] = useState(false);
  const [yazioMeals, setYazioMeals] = useState<Meal[]>([]);

  // ─── Diet prefs ────────────────────────────────────────────────────────────
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [planDays, setPlanDays] = useState(3);
  const [kcalMode, setKcalMode] = useState<KcalMode>('auto');
  const [targetKcal, setTargetKcal] = useState(2000);
  const [kcalAdjustment, setKcalAdjustment] = useState(500);

  // ─── Workout prefs ─────────────────────────────────────────────────────────
  const [restSeconds, setRestSeconds] = useState(90);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');

  // ─── Plan view ─────────────────────────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [showAlts, setShowAlts] = useState<Record<string, boolean>>({});

  // ─── Adaptive ──────────────────────────────────────────────────────────────
  const [adaptReport, setAdaptReport] = useState('');
  const [adapting, setAdapting] = useState(false);
  const [adaptedDay, setAdaptedDay] = useState<AdaptedDay | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // ─── Workout logging ───────────────────────────────────────────────────────
  const [loggingEx, setLoggingEx] = useState<{ name: string; focus: string } | null>(null);
  const [logSets, setLogSets] = useState<{ reps: string; weight: string }[]>([{ reps: '', weight: '' }]);
  const [savingLog, setSavingLog] = useState(false);
  const [logMsg, setLogMsg] = useState('');

  useEffect(() => {
    fetch('/api/user/plan').then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); });
    fetch('/api/user/profile').then(r => r.json()).then(d => setHasProfile(!!d.profile));
    fetch('/api/user/settings').then(r => r.json()).then(d => setHasKey(!!d.anthropicKey));
    fetch('/api/yazio/diary').then(r => r.json()).then(d => {
      setYazioConnected(d.connected === true);
      if (d.connected) setYazioMeals(d.meals ?? []);
    });
  }, []);

  const generate = async () => {
    setLoading(true); setError(''); setSteps(['🤖 Connessione a Claude AI...']);
    try {
      const res = await fetch('/api/piano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genMeal, genWorkout,
          dietPrefs: { mealsPerDay, planDays, kcalMode, targetKcal: kcalMode === 'manual' ? targetKcal : undefined, kcalAdjustment },
          workoutPrefs: { restSeconds, sessionMinutes, intensity },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore generazione');
      setSteps(data.execution_steps ?? []);
      setPlan(data);
      setSelectedDay(0); setSelectedOptions({}); setAdaptedDay(null);
      setTab('overview');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Errore sconosciuto');
      setSteps([]);
    } finally { setLoading(false); }
  };

  const autoFillFromYazio = () => {
    const lines = yazioMeals.map(m =>
      `${m.meal_name}: ${m.foods?.map(f => `${f.name} (${f.amount})`).join(', ') || '—'} — ${Math.round(m.total_calories)} kcal`
    );
    const total = Math.round(yazioMeals.reduce((s, m) => s + m.total_calories, 0));
    setAdaptReport(`Ho mangiato oggi (da Yazio):\n${lines.join('\n')}\nTotale: ${total} kcal`);
  };

  const adaptPlan = async () => {
    if (!adaptReport.trim()) return;
    setAdapting(true); setAdaptedDay(null);
    try {
      const res = await fetch('/api/dieta/adatta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: adaptReport, dayIndex: selectedDay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdaptedDay(data.adapted as AdaptedDay);
    } catch (e: unknown) {
      alert((e as { message?: string })?.message ?? 'Errore adattamento');
    } finally { setAdapting(false); }
  };

  const syncToYazio = async () => {
    if (!plan?.meal_plan) return;
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch('/api/yazio/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_plan: plan.meal_plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore sync');
      setSyncResult(`✅ ${data.count} pasti sincronizzati su Yazio!`);
    } catch (e: unknown) {
      setSyncResult(`❌ ${(e as { message?: string })?.message}`);
    } finally { setSyncing(false); }
  };

  const saveWorkoutLog = async () => {
    if (!loggingEx) return;
    const sets = logSets.filter(s => s.reps).map(s => ({ reps: parseInt(s.reps), weight_kg: s.weight ? parseFloat(s.weight) : undefined }));
    if (!sets.length) return;
    setSavingLog(true);
    const res = await fetch('/api/user/workout-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_name: loggingEx.name, session_focus: loggingEx.focus, sets, date: new Date().toISOString().slice(0, 10) }),
    });
    setSavingLog(false);
    if (res.ok) {
      setLogMsg('✅ Allenamento salvato! Verrà usato per il progressive overload al prossimo piano.');
      setLoggingEx(null); setLogSets([{ reps: '', weight: '' }]);
      setTimeout(() => setLogMsg(''), 4000);
    }
  };

  const meal = plan?.meal_plan as MealPlan | undefined;
  const workout = plan?.workout_plan as WorkoutPlan | undefined;
  const days = meal?.days ?? [];
  const currentDay = days[selectedDay];
  const yazioTodayKcal = Math.round(yazioMeals.reduce((s, m) => s + m.total_calories, 0));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Piano AI</h1>

      {/* ── Generate card ─────────────────────────────────────────────────── */}
      <div className="card border-primary/30 bg-primary/5">
        <h2 className="font-bold text-lg mb-1">⚡ Genera Piano Personalizzato</h2>
        <p className="text-sub text-sm mb-4">Powered by Claude (Anthropic)</p>

        <div className="space-y-3 mb-4">
          {/* Piano alimentare toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Piano alimentare</span>
            <button onClick={() => setGenMeal(!genMeal)} className={`w-12 h-6 rounded-full transition-all relative ${genMeal ? 'bg-primary' : 'bg-border'}`}>
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${genMeal ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          {genMeal && (
            <div className="bg-surfaceB rounded-xl p-4 space-y-4 border border-border">
              {/* Pasti/giorno */}
              <div>
                <p className="text-xs font-medium text-sub mb-2">Pasti al giorno</p>
                <div className="flex gap-1.5">
                  {[2,3,4,5,6].map(n => (
                    <button key={n} onClick={() => setMealsPerDay(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mealsPerDay===n ? 'bg-primary text-white' : 'bg-border text-sub hover:bg-primary/20'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Giorni di piano */}
              <div>
                <p className="text-xs font-medium text-sub mb-2">Giorni di piano</p>
                <div className="flex gap-1.5">
                  {[1,3,5,7].map(n => (
                    <button key={n} onClick={() => setPlanDays(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${planDays===n ? 'bg-primary text-white' : 'bg-border text-sub hover:bg-primary/20'}`}>
                      {n}g
                    </button>
                  ))}
                </div>
              </div>

              {/* Calorie mode */}
              <div>
                <p className="text-xs font-medium text-sub mb-2">Calorie target</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    {v:'auto',    label:'🤖 Auto',    desc:'Calcolate dal profilo'},
                    {v:'deficit', label:'📉 Deficit',  desc:'Per dimagrire'},
                    {v:'surplus', label:'📈 Surplus',  desc:'Per fare massa'},
                    {v:'manual',  label:'✏️ Manuale', desc:'Imposti tu le kcal'},
                  ] as {v:KcalMode;label:string;desc:string}[]).map(opt => (
                    <button key={opt.v} onClick={() => setKcalMode(opt.v)}
                      className={`p-3 rounded-xl border text-left transition-all ${kcalMode===opt.v ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-muted text-xs">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {kcalMode==='deficit' && (
                  <div className="mt-3">
                    <p className="text-xs text-sub mb-2">Deficit giornaliero</p>
                    <div className="flex gap-1.5">
                      {[300,400,500,600].map(d => (
                        <button key={d} onClick={() => setKcalAdjustment(d)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${kcalAdjustment===d ? 'bg-primary text-white' : 'bg-border text-sub'}`}>
                          -{d}
                        </button>
                      ))}
                    </div>
                    <p className="text-muted text-xs mt-1 text-center">≈ {(kcalAdjustment/1000).toFixed(1)} kg ogni 10 giorni</p>
                  </div>
                )}
                {kcalMode==='surplus' && (
                  <div className="mt-3">
                    <p className="text-xs text-sub mb-2">Surplus giornaliero</p>
                    <div className="flex gap-1.5">
                      {[150,250,350,500].map(d => (
                        <button key={d} onClick={() => setKcalAdjustment(d)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${kcalAdjustment===d ? 'bg-accent text-bg' : 'bg-border text-sub'}`}>
                          +{d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {kcalMode==='manual' && (
                  <div className="mt-3">
                    <input type="number" min={800} max={6000} step={50} className="input text-xl font-bold text-center"
                      value={targetKcal} onChange={e => setTargetKcal(parseInt(e.target.value)||2000)} />
                    <p className="text-muted text-xs text-center mt-1">kcal / giorno</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Piano allenamento toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Piano allenamento</span>
            <button onClick={() => setGenWorkout(!genWorkout)} className={`w-12 h-6 rounded-full transition-all relative ${genWorkout ? 'bg-primary' : 'bg-border'}`}>
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${genWorkout ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>

          {genWorkout && (
            <div className="bg-surfaceB rounded-xl p-4 space-y-4 border border-border">
              {/* Durata */}
              <div>
                <p className="text-xs font-medium text-sub mb-2">Durata sessione</p>
                <div className="flex gap-1.5">
                  {[30,45,60,90].map(n => (
                    <button key={n} onClick={() => setSessionMinutes(n)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${sessionMinutes===n ? 'bg-primary text-white' : 'bg-border text-sub hover:bg-primary/20'}`}>
                      {n}min
                    </button>
                  ))}
                </div>
              </div>

              {/* Riposo */}
              <div>
                <p className="text-xs font-medium text-sub mb-2">Riposo tra le serie</p>
                <div className="flex gap-1.5">
                  {[30,60,90,120,180].map(n => (
                    <button key={n} onClick={() => setRestSeconds(n)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${restSeconds===n ? 'bg-primary text-white' : 'bg-border text-sub hover:bg-primary/20'}`}>
                      {n}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensità */}
              <div>
                <p className="text-xs font-medium text-sub mb-2">Intensità</p>
                <div className="flex gap-1.5">
                  {([['light','🟢 Leggera'],['moderate','🟡 Moderata'],['intense','🔴 Intensa']] as [typeof intensity, string][]).map(([v,label]) => (
                    <button key={v} onClick={() => setIntensity(v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${intensity===v ? 'bg-primary text-white' : 'bg-border text-sub hover:bg-primary/20'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button onClick={generate} disabled={loading} className="btn-primary w-full">
          {loading
            ? <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>Generazione...
              </span>
            : '🚀 Genera Piano'}
        </button>
        {!hasProfile && <p className="text-yellow-400 text-xs text-center mt-2">⚠️ Configura prima il profilo</p>}
        {!hasKey && <p className="text-danger text-xs text-center mt-2">⚠️ API Key mancante — vai su Impostazioni</p>}
      </div>

      {/* Loading */}
      {loading && steps.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3">🔄 Elaborazione...</h3>
          {steps.map((s,i) => <p key={i} className="text-sub text-sm mb-1.5">{s}</p>)}
          <p className="text-muted text-xs mt-3 italic">30-90 secondi per piani multi-giorno...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="card border-danger/40 bg-danger/5">
          <h3 className="font-bold text-danger mb-2">❌ Errore</h3>
          <p className="text-sm text-sub">{error}</p>
        </div>
      )}

      {/* Piano generato — TABS + contenuto nei task successivi */}
      {plan && !loading && (
        <>
          <div className="flex gap-2">
            {(['overview','meals','workout'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===t ? 'bg-primary text-white' : 'bg-surfaceB text-sub hover:text-white'}`}>
                {t==='overview' ? '📋 Riepilogo' : t==='meals' ? '🥗 Pasti' : '🏋️ Workout'}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab==='overview' && (
            <div className="space-y-4">
              {plan.summary && <div className="card border-accent/30 bg-accent/5"><h3 className="font-bold mb-2">📝 Il tuo piano</h3><p className="text-sub text-sm leading-relaxed">{plan.summary}</p></div>}
              {meal && (
                <div className="card">
                  <h3 className="font-bold mb-3">🥗 Dieta</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surfaceB rounded-xl p-2"><p className="text-muted text-xs">Kcal/giorno</p><p className="font-bold text-primary">{meal.target_kcal ?? Math.round(meal.total_daily_calories)}</p></div>
                    <div className="bg-surfaceB rounded-xl p-2"><p className="text-muted text-xs">Pasti</p><p className="font-bold">{meal.meals_per_day ?? '—'}</p></div>
                    <div className="bg-surfaceB rounded-xl p-2"><p className="text-muted text-xs">Giorni</p><p className="font-bold">{days.length || 1}</p></div>
                  </div>
                </div>
              )}
              {workout && (
                <div className="card">
                  <h3 className="font-bold mb-3">🏋️ Allenamento</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surfaceB rounded-xl p-2"><p className="text-muted text-xs">Sessioni</p><p className="font-bold text-primary">{workout.sessions?.length}</p></div>
                    <div className="bg-surfaceB rounded-xl p-2"><p className="text-muted text-xs">Durata</p><p className="font-bold">{workout.sessions?.[0]?.duration_minutes ?? '—'}min</p></div>
                    <div className="bg-surfaceB rounded-xl p-2"><p className="text-muted text-xs">Riposo</p><p className="font-bold">{workout.sessions?.[0]?.rest_between_sets ?? '—'}s</p></div>
                  </div>
                </div>
              )}
              {(plan.execution_steps??[]).length>0 && <div className="card"><h3 className="font-bold mb-3">✅ Agenti eseguiti</h3>{(plan.execution_steps??[]).map((s,i)=><p key={i} className="text-sub text-sm mb-1.5">{s}</p>)}</div>}
            </div>
          )}

          {/* ── Meals tab ──────────────────────────────────────────────────── */}
          {tab==='meals' && (
            <div className="space-y-4">
              {meal ? (
                <>
                  {/* Target + Yazio compare */}
                  <div className="card border-accent/30 bg-accent/5">
                    <h3 className="font-bold mb-3">🎯 Target Giornaliero</h3>
                    <div className="flex items-end gap-1 mb-4">
                      <span className="text-4xl font-extrabold text-accent">{meal.target_kcal ?? Math.round(meal.total_daily_calories)}</span>
                      <span className="text-sub mb-1">kcal</span>
                    </div>
                    <MacroBar label="Proteine"    value={meal.total_protein_g} max={250} color="#6C63FF" />
                    <MacroBar label="Carboidrati" value={meal.total_carbs_g}   max={400} color="#43D9AD" />
                    <MacroBar label="Grassi"      value={meal.total_fat_g}     max={150} color="#FF6584" />

                    {yazioConnected && yazioTodayKcal > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-sub font-medium mb-2">📲 Yazio oggi</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold">{yazioTodayKcal} kcal registrate</p>
                          {(() => {
                            const target = meal.target_kcal ?? meal.total_daily_calories;
                            const delta = yazioTodayKcal - target;
                            return (
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${delta > 100 ? 'bg-danger/20 text-danger' : delta < -200 ? 'bg-yellow-400/20 text-yellow-400' : 'bg-accent/20 text-accent'}`}>
                                {delta > 0 ? '+' : ''}{delta} kcal vs target
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Day selector */}
                  {days.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {days.map((d, i) => (
                        <button key={i} onClick={() => setSelectedDay(i)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all ${selectedDay===i ? 'bg-primary text-white' : 'bg-surfaceB text-sub hover:text-white'}`}>
                          {d.day}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Meal cards */}
                  {(currentDay?.meals ?? meal.meals ?? []).map((m: Meal, i: number) => (
                    <EnhancedMealCard key={i} meal={m}
                      selectedOption={selectedOptions[m.meal_name] ?? 0}
                      onOptionChange={opt => setSelectedOptions(prev => ({ ...prev, [m.meal_name]: opt }))}
                    />
                  ))}

                  {meal.notes && <div className="card"><p className="text-sub text-sm">💡 {meal.notes}</p></div>}

                  {/* ── Sezione adattiva ─────────────────────────────────── */}
                  <div className="card border-yellow-400/30 bg-yellow-400/5">
                    <h3 className="font-bold mb-1">🔄 Adatta il piano</h3>
                    <p className="text-sub text-xs mb-3">Hai sgarrato? Mangiato fuori? Saltato un pasto? Descrivilo — Claude adatta il pasto successivo o domani.</p>

                    {yazioConnected && yazioMeals.length > 0 && (
                      <button onClick={autoFillFromYazio}
                        className="w-full mb-3 py-2 rounded-xl border border-accent/50 text-accent text-sm font-semibold hover:bg-accent/10 transition-colors">
                        📲 Importa pasti reali da Yazio
                      </button>
                    )}

                    <textarea
                      className="input min-h-[90px] resize-none text-sm"
                      placeholder={'Es: "Ho mangiato una pizza a pranzo (~900 kcal), ho saltato la cena"\nEs: "Cena fuori: antipasto, pasta, dolce"\nEs: "Ho mangiato pochissimo, solo una mela e un caffè"'}
                      value={adaptReport}
                      onChange={e => setAdaptReport(e.target.value)}
                    />

                    <button onClick={adaptPlan} disabled={adapting || !adaptReport.trim()}
                      className="btn-primary w-full mt-3">
                      {adapting ? '⏳ Claude sta ricalcolando...' : '🧠 Adatta piano'}
                    </button>

                    {adaptedDay && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {adaptedDay.motivation && (
                          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3">
                            <p className="text-accent text-sm font-medium">{adaptedDay.motivation}</p>
                          </div>
                        )}
                        {adaptedDay.adjustment_reason && (
                          <p className="text-muted text-xs italic">📊 {adaptedDay.adjustment_reason}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{adaptedDay.day}</p>
                          <p className="text-accent text-sm font-semibold">{Math.round(adaptedDay.total_calories)} kcal</p>
                        </div>
                        <p className="text-muted text-xs">P:{Math.round(adaptedDay.total_protein_g)}g · C:{Math.round(adaptedDay.total_carbs_g)}g · F:{Math.round(adaptedDay.total_fat_g)}g</p>
                        {adaptedDay.meals.map((m: Meal, i: number) => (
                          <EnhancedMealCard key={i} meal={m} selectedOption={0} onOptionChange={() => {}} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Sync Yazio ───────────────────────────────────────── */}
                  {yazioConnected && (
                    <div className="card border-accent/30 bg-accent/5">
                      <h3 className="font-bold mb-1">🥗 Sync su Yazio</h3>
                      <p className="text-sub text-xs mb-3">Invia il piano pasti al diario Yazio</p>
                      {syncResult && <p className="text-sm mb-2">{syncResult}</p>}
                      <button onClick={syncToYazio} disabled={syncing} className="btn-primary w-full">
                        {syncing ? '⏳ Sync...' : '🔄 Sincronizza su Yazio'}
                      </button>
                    </div>
                  )}
                </>
              ) : <p className="text-sub text-center py-8">Piano alimentare non generato.</p>}
            </div>
          )}

          {/* ── Workout tab ────────────────────────────────────────────────── */}
          {tab==='workout' && (
            <div className="space-y-4">
              {logMsg && <div className="card border-accent/30 bg-accent/5"><p className="text-accent text-sm font-semibold">{logMsg}</p></div>}
              {workout ? (
                <>
                  {workout.sessions?.map((s: WorkoutSession, i: number) => (
                    <EnhancedWorkoutCard key={i} session={s}
                      loggingEx={loggingEx}
                      onStartLog={(name, focus) => { setLoggingEx({name, focus}); setLogSets([{reps:'',weight:''}]); }}
                      onStopLog={() => setLoggingEx(null)}
                      logSets={logSets}
                      onSetChange={setLogSets}
                      onSaveLog={saveWorkoutLog}
                      savingLog={savingLog}
                      showAlts={showAlts}
                      onToggleAlt={name => setShowAlts(prev => ({...prev, [name]: !prev[name]}))}
                    />
                  ))}
                  {workout.progression_notes && (
                    <div className="card">
                      <h3 className="font-bold mb-2">📈 Progressione</h3>
                      <p className="text-sub text-sm">{workout.progression_notes}</p>
                    </div>
                  )}
                  {workout.notes && <div className="card"><p className="text-sub text-sm">💡 {workout.notes}</p></div>}
                </>
              ) : <p className="text-sub text-center py-8">Piano allenamento non generato.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── EnhancedMealCard ─────────────────────────────────────────────────────────
function EnhancedMealCard({ meal, selectedOption, onOptionChange }: {
  meal: Meal;
  selectedOption: number;
  onOptionChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const opts = meal.options ?? [];
  const active = opts[selectedOption];
  const foods = active?.foods ?? meal.foods ?? [];
  const kcal  = active ? active.total_calories : meal.total_calories;
  const prot  = active ? active.total_protein_g : meal.total_protein_g;
  const carb  = active ? active.total_carbs_g : meal.total_carbs_g;
  const fat   = active ? active.total_fat_g : meal.total_fat_g;

  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center">
        <div className="text-left">
          <p className="font-bold">{meal.meal_name}</p>
          {meal.time && <p className="text-muted text-xs">🕐 {meal.time}</p>}
        </div>
        <div className="text-right">
          <p className="text-primary font-bold">{Math.round(kcal)} kcal</p>
          <p className="text-muted text-xs">{open ? '▲' : '▼'}</p>
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {/* Option A/B toggle */}
          {opts.length > 1 && (
            <div className="flex gap-2">
              {opts.map((opt: MealOption, i: number) => (
                <button key={i} onClick={() => onOptionChange(i)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedOption===i ? 'bg-primary text-white border-primary' : 'border-border text-sub hover:border-primary/50'}`}>
                  {opt.option_name}
                </button>
              ))}
            </div>
          )}

          {/* Macros */}
          <div className="flex gap-2 flex-wrap">
            {[{l:'P',v:prot},{l:'C',v:carb},{l:'F',v:fat}].map(({l,v}) => (
              <span key={l} className="bg-surfaceB text-sub text-xs font-semibold px-3 py-1 rounded-full">{l}: {Math.round(v)}g</span>
            ))}
          </div>

          {/* Foods */}
          {foods.map((f, i) => (
            <div key={i} className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-sm">• {f.name}</span>
              <span className="text-muted text-xs">{f.amount} · {f.calories} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── EnhancedWorkoutCard ──────────────────────────────────────────────────────
function EnhancedWorkoutCard({ session, loggingEx, onStartLog, onStopLog, logSets, onSetChange, onSaveLog, savingLog, showAlts, onToggleAlt }: {
  session: WorkoutSession;
  loggingEx: { name: string; focus: string } | null;
  onStartLog: (name: string, focus: string) => void;
  onStopLog: () => void;
  logSets: { reps: string; weight: string }[];
  onSetChange: (sets: { reps: string; weight: string }[]) => void;
  onSaveLog: () => void;
  savingLog: boolean;
  showAlts: Record<string, boolean>;
  onToggleAlt: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center">
        <div className="text-left">
          <p className="font-bold">{session.day}</p>
          <p className="text-sub text-sm">{session.focus}</p>
        </div>
        <div className="text-right">
          {session.duration_minutes && <p className="text-primary font-bold">{session.duration_minutes}min</p>}
          {session.rest_between_sets && <p className="text-muted text-xs">Riposo: {session.rest_between_sets}s</p>}
          <p className="text-muted text-xs">{open ? '▲' : '▼'}</p>
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {session.exercises?.map((ex, i) => {
            const isLogging = loggingEx?.name === ex.name && loggingEx?.focus === session.focus;
            const altKey = `${session.focus}-${ex.name}`;

            return (
              <div key={i} className="bg-surfaceB rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">💪 {ex.name}</p>
                    {ex.weight_suggestion && <p className="text-primary text-xs mt-0.5">⚖️ {ex.weight_suggestion}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    {ex.alternatives && ex.alternatives.length > 0 && (
                      <button onClick={() => onToggleAlt(altKey)}
                        className="text-xs px-2 py-1 rounded-lg border border-border text-sub hover:border-primary/50 transition-colors">
                        Alt.
                      </button>
                    )}
                    <button onClick={() => isLogging ? onStopLog() : onStartLog(ex.name, session.focus)}
                      className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${isLogging ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>
                      {isLogging ? '✕' : '+ Log'}
                    </button>
                  </div>
                </div>

                {/* Set/reps info */}
                <div className="flex gap-2 flex-wrap">
                  {ex.sets && <span className="bg-border text-sub text-xs px-2 py-1 rounded-lg">{ex.sets} serie</span>}
                  {ex.reps && <span className="bg-border text-sub text-xs px-2 py-1 rounded-lg">{ex.reps} rip</span>}
                  {ex.rest && <span className="bg-border text-sub text-xs px-2 py-1 rounded-lg">Riposo: {ex.rest}</span>}
                </div>

                {ex.notes && <p className="text-muted text-xs italic">{ex.notes}</p>}

                {/* Alternatives */}
                {showAlts[altKey] && ex.alternatives && (
                  <div className="border-t border-border/50 pt-2 space-y-1.5">
                    <p className="text-xs text-sub font-semibold mb-1">Alternative:</p>
                    {ex.alternatives.map((alt: ExerciseAlternative, j: number) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span className="text-muted">→</span>
                        <span className="font-medium">{alt.name}</span>
                        <span className="text-muted">{alt.sets}×{alt.reps}</span>
                        {alt.notes && <span className="text-muted italic truncate">({alt.notes})</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Workout logger */}
                {isLogging && (
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-sub">Registra oggi:</p>
                    {logSets.map((s, si) => (
                      <div key={si} className="flex gap-2 items-center">
                        <span className="text-muted text-xs w-12">Serie {si+1}</span>
                        <input type="number" placeholder="Rip" min="1" max="100"
                          className="input py-1 text-center text-sm flex-1"
                          value={s.reps} onChange={e => { const n=[...logSets]; n[si]={...n[si],reps:e.target.value}; onSetChange(n); }} />
                        <input type="number" placeholder="kg" min="0" max="500" step="0.5"
                          className="input py-1 text-center text-sm flex-1"
                          value={s.weight} onChange={e => { const n=[...logSets]; n[si]={...n[si],weight:e.target.value}; onSetChange(n); }} />
                        {logSets.length > 1 && (
                          <button onClick={() => onSetChange(logSets.filter((_,idx)=>idx!==si))} className="text-muted text-xs hover:text-danger">✕</button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button onClick={() => onSetChange([...logSets,{reps:'',weight:''}])}
                        className="flex-1 py-1.5 rounded-xl border border-border text-sub text-xs hover:border-primary/50 transition-colors">
                        + Serie
                      </button>
                      <button onClick={onSaveLog} disabled={savingLog}
                        className="flex-1 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                        {savingLog ? '...' : '💾 Salva'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {session.notes && <p className="text-sub text-sm italic">💡 {session.notes}</p>}
        </div>
      )}
    </div>
  );
}
