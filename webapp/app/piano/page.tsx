'use client';
import { useState, useEffect } from 'react';
import type { FitnessPlan, Meal, WorkoutSession, MealPlan, WorkoutPlan } from '@/lib/types';
import MacroBar from '@/components/MacroBar';

type Tab = 'overview' | 'meals' | 'workout';

export default function Piano() {
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [genMeal, setGenMeal] = useState(true);
  const [genWorkout, setGenWorkout] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [yazioConnected, setYazioConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user/plan').then(r => r.json()).then(d => { if (d.plan) setPlan(d.plan); });
    fetch('/api/user/profile').then(r => r.json()).then(d => setHasProfile(!!d.profile));
    fetch('/api/user/settings').then(r => r.json()).then(d => setHasKey(!!d.anthropicKey));
    fetch('/api/yazio/diary').then(r => r.json()).then(d => setYazioConnected(d.connected === true));
  }, []);

  const generate = async () => {
    setLoading(true); setError(''); setSteps(['🤖 Connessione a Claude AI...']);
    try {
      const res = await fetch('/api/piano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genMeal, genWorkout }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore generazione');
      setSteps(data.execution_steps ?? []);
      setPlan(data);
      setTab('overview');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Errore sconosciuto');
      setSteps([]);
    } finally { setLoading(false); }
  };

  const syncToYazio = async () => {
    if (!plan?.meal_plan) return;
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch('/api/yazio/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_plan: plan.meal_plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore sync');
      setSyncResult(`✅ Sincronizzati ${data.count} pasti su Yazio!`);
    } catch (e: unknown) {
      setSyncResult(`❌ ${(e as { message?: string })?.message ?? 'Errore sconosciuto'}`);
    } finally { setSyncing(false); }
  };

  const meal = plan?.meal_plan as MealPlan | undefined;
  const workout = plan?.workout_plan as WorkoutPlan | undefined;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Piano AI</h1>

      <div className="card border-primary/30 bg-primary/5">
        <h2 className="font-bold text-lg mb-1">⚡ Genera Piano Personalizzato</h2>
        <p className="text-sub text-sm mb-4">Powered by Claude (Anthropic)</p>
        <div className="space-y-3 mb-4">
          {[{label:'Piano alimentare',val:genMeal,set:setGenMeal},{label:'Piano allenamento',val:genWorkout,set:setGenWorkout}].map(({label,val,set}) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <button onClick={() => set(!val)} className={`w-12 h-6 rounded-full transition-all relative ${val ? 'bg-primary' : 'bg-border'}`}>
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${val ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary w-full">
          {loading ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Generazione...</span> : '🚀 Genera Piano'}
        </button>
        {!hasProfile && <p className="text-yellow-400 text-xs text-center mt-2">⚠️ Configura prima il profilo</p>}
        {!hasKey && <p className="text-danger text-xs text-center mt-2">⚠️ API Key mancante — vai su Impostazioni</p>}
      </div>

      {loading && steps.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3">🔄 Elaborazione...</h3>
          {steps.map((s, i) => <p key={i} className="text-sub text-sm mb-1.5">{s}</p>)}
          <p className="text-muted text-xs mt-3 italic">30-60 secondi...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card border-danger/40 bg-danger/5">
          <h3 className="font-bold text-danger mb-2">❌ Errore</h3>
          <p className="text-sm text-sub">{error}</p>
        </div>
      )}

      {plan && !loading && (
        <>
          <div className="flex gap-2">
            {(['overview','meals','workout'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab===t ? 'bg-primary text-white' : 'bg-surfaceB text-sub hover:text-white'}`}>
                {t==='overview' ? '📋 Riepilogo' : t==='meals' ? '🥗 Pasti' : '🏋️ Workout'}
              </button>
            ))}
          </div>

          {tab==='overview' && (
            <div className="space-y-4">
              {plan.summary && <div className="card border-accent/30 bg-accent/5"><h3 className="font-bold mb-2">📝 Il tuo piano</h3><p className="text-sub text-sm leading-relaxed">{plan.summary}</p></div>}
              {(plan.execution_steps??[]).length>0 && <div className="card"><h3 className="font-bold mb-3">✅ Agenti eseguiti</h3>{(plan.execution_steps??[]).map((s,i)=><p key={i} className="text-sub text-sm mb-1.5">{s}</p>)}</div>}
            </div>
          )}

          {tab==='meals' && (
            <div className="space-y-4">
              {meal ? (
                <>
                  <div className="card border-accent/30 bg-accent/5">
                    <h3 className="font-bold mb-4">🎯 Target Giornaliero</h3>
                    <div className="flex items-end gap-1 mb-4"><span className="text-4xl font-extrabold text-accent">{Math.round(meal.total_daily_calories)}</span><span className="text-sub mb-1">kcal</span></div>
                    <MacroBar label="Proteine" value={meal.total_protein_g} max={250} color="#6C63FF" />
                    <MacroBar label="Carboidrati" value={meal.total_carbs_g} max={400} color="#43D9AD" />
                    <MacroBar label="Grassi" value={meal.total_fat_g} max={150} color="#FF6584" />
                  </div>
                  {meal.meals?.map((m:Meal,i:number) => <MealCard key={i} meal={m} />)}
                  {meal.notes && <div className="card"><p className="text-sub text-sm">💡 {meal.notes}</p></div>}
                  {yazioConnected && (
                    <div className="card border-accent/30 bg-accent/5">
                      <h3 className="font-bold mb-1">🥗 Sincronizza su Yazio</h3>
                      <p className="text-sub text-xs mb-3">Invia tutti i pasti di oggi al tuo diario Yazio</p>
                      {syncResult && <p className="text-sm mb-3">{syncResult}</p>}
                      <button onClick={syncToYazio} disabled={syncing} className="btn-primary w-full">
                        {syncing ? '⏳ Sincronizzazione...' : '🔄 Sync su Yazio'}
                      </button>
                    </div>
                  )}
                </>
              ) : <p className="text-sub text-center py-8">Piano alimentare non generato.</p>}
            </div>
          )}

          {tab==='workout' && (
            <div className="space-y-4">
              {workout ? (
                <>
                  {workout.sessions?.map((s:WorkoutSession,i:number) => <WorkoutCard key={i} session={s} />)}
                  {workout.progression_notes && <div className="card"><h3 className="font-bold mb-2">📈 Progressione</h3><p className="text-sub text-sm">{workout.progression_notes}</p></div>}
                </>
              ) : <p className="text-sub text-center py-8">Piano allenamento non generato.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center">
        <div className="text-left"><p className="font-bold">{meal.meal_name}</p>{meal.time && <p className="text-muted text-xs">🕐 {meal.time}</p>}</div>
        <div className="text-right"><p className="text-primary font-bold">{Math.round(meal.total_calories)} kcal</p><p className="text-muted text-xs">{open?'▲':'▼'}</p></div>
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex gap-2 mb-3 flex-wrap">
            {[{l:'P',v:meal.total_protein_g},{l:'C',v:meal.total_carbs_g},{l:'F',v:meal.total_fat_g}].map(({l,v}) => (
              <span key={l} className="bg-surfaceB text-sub text-xs font-semibold px-3 py-1 rounded-full">{l}: {Math.round(v)}g</span>
            ))}
          </div>
          {meal.foods?.map((f,i) => (
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

function WorkoutCard({ session }: { session: WorkoutSession }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="w-full flex justify-between items-center">
        <div className="text-left"><p className="font-bold">{session.day}</p><p className="text-sub text-sm">{session.focus}</p></div>
        <div className="text-right">{session.duration_minutes && <p className="text-primary font-bold">{session.duration_minutes} min</p>}<p className="text-muted text-xs">{open?'▲':'▼'}</p></div>
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {session.exercises?.map((ex,i) => (
            <div key={i}>
              <p className="font-semibold text-sm">💪 {ex.name}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {ex.sets && <span className="bg-surfaceB text-sub text-xs px-2 py-1 rounded-lg">{ex.sets} serie</span>}
                {ex.reps && <span className="bg-surfaceB text-sub text-xs px-2 py-1 rounded-lg">{ex.reps} rip</span>}
                {ex.rest && <span className="bg-surfaceB text-sub text-xs px-2 py-1 rounded-lg">Riposo: {ex.rest}</span>}
              </div>
              {ex.notes && <p className="text-muted text-xs mt-1 italic">{ex.notes}</p>}
            </div>
          ))}
          {session.notes && <p className="text-sub text-sm italic mt-2">💡 {session.notes}</p>}
        </div>
      )}
    </div>
  );
}
