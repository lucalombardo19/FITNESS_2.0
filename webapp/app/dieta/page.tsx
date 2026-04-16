'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MacroBar from '@/components/MacroBar';
import type { MealPlan, Meal, MealOption, DayPlan } from '@/lib/types';

type AdaptedDay = DayPlan & { motivation?: string; adjustment_reason?: string };

export default function Dieta() {
  const [meal, setMeal] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});

  // Yazio
  const [yazioConnected, setYazioConnected] = useState(false);
  const [yazioMeals, setYazioMeals] = useState<Meal[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  // Adaptive
  const [adaptReport, setAdaptReport] = useState('');
  const [adapting, setAdapting] = useState(false);
  const [adaptedDay, setAdaptedDay] = useState<AdaptedDay | null>(null);

  useEffect(() => {
    fetch('/api/user/plan').then(r => r.json()).then(d => {
      setMeal(d.plan?.meal_plan ?? null);
      setLoading(false);
    });
    fetch('/api/yazio/diary').then(r => r.json()).then(d => {
      setYazioConnected(d.connected === true);
      if (d.connected) setYazioMeals(d.meals ?? []);
    });
  }, []);

  const days = meal?.days ?? [];
  const currentDay = days[selectedDay];
  const currentMeals: Meal[] = currentDay?.meals ?? meal?.meals ?? [];
  const targetKcal = meal?.target_kcal ?? meal?.total_daily_calories ?? 0;
  const yazioKcal = Math.round(yazioMeals.reduce((s, m) => s + m.total_calories, 0));

  const autoFillFromYazio = () => {
    const lines = yazioMeals.map(m =>
      `${m.meal_name}: ${m.foods?.map(f => `${f.name} (${f.amount})`).join(', ') || '—'} — ${Math.round(m.total_calories)} kcal`
    );
    setAdaptReport(`Ho mangiato oggi (Yazio):\n${lines.join('\n')}\nTotale: ${yazioKcal} kcal`);
  };

  const adaptPlan = async () => {
    if (!adaptReport.trim()) return;
    setAdapting(true); setAdaptedDay(null);
    try {
      const res = await fetch('/api/dieta/adatta', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: adaptReport, dayIndex: selectedDay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAdaptedDay(data.adapted as AdaptedDay);
    } catch (e: unknown) { alert((e as {message?:string})?.message); }
    finally { setAdapting(false); }
  };

  const syncYazio = async () => {
    if (!meal) return;
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/yazio/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_plan: meal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncMsg(`✅ ${data.count} pasti sincronizzati!`);
    } catch (e: unknown) { setSyncMsg(`❌ ${(e as {message?:string})?.message}`); }
    finally { setSyncing(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sub text-sm">Caricamento piano...</p>
    </div>
  );

  if (!meal) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="text-6xl mb-4">🥗</div>
      <h2 className="text-xl font-bold mb-2">Nessun piano alimentare</h2>
      <p className="text-sub text-sm mb-6">Genera il tuo primo piano personalizzato con Claude AI</p>
      <Link href="/piano" className="btn-primary inline-block px-8">⚡ Genera Piano</Link>
    </div>
  );

  const kcalDelta = yazioKcal > 0 ? yazioKcal - targetKcal : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 border border-accent/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-extrabold">🥗 Dieta</h1>
            <p className="text-sub text-sm mt-0.5">{days.length > 0 ? `Piano ${days.length} giorni · ${meal.meals_per_day} pasti/giorno` : 'Il tuo piano alimentare'}</p>
          </div>
          <Link href="/piano" className="text-primary text-sm font-semibold bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors">
            ↺ Rigenera
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBadge label="Kcal/giorno" value={String(Math.round(targetKcal))} color="accent" />
          <StatBadge label="Proteine" value={`${Math.round(meal.total_protein_g)}g`} color="primary" />
          <StatBadge label="Carboidrati" value={`${Math.round(meal.total_carbs_g)}g`} color="yellow" />
        </div>
      </div>

      {/* Yazio banner */}
      {yazioConnected && yazioKcal > 0 && (
        <div className={`rounded-2xl border p-4 ${kcalDelta! > 150 ? 'border-danger/30 bg-danger/5' : kcalDelta! < -200 ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-accent/30 bg-accent/5'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-sub font-medium mb-0.5">📲 Yazio oggi</p>
              <p className="font-bold text-lg">{yazioKcal} <span className="text-sub text-sm font-normal">kcal consumate</span></p>
            </div>
            <div className={`text-right`}>
              <p className={`text-xl font-extrabold ${kcalDelta! > 150 ? 'text-danger' : kcalDelta! < -200 ? 'text-yellow-400' : 'text-accent'}`}>
                {kcalDelta! > 0 ? '+' : ''}{kcalDelta}
              </p>
              <p className="text-muted text-xs">vs target</p>
            </div>
          </div>
        </div>
      )}

      {/* Day selector */}
      {days.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d, i) => (
            <button key={i} onClick={() => setSelectedDay(i)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all ${selectedDay===i ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surfaceB text-sub hover:bg-border'}`}>
              {d.day}
            </button>
          ))}
        </div>
      )}

      {/* Macros for selected day */}
      {currentDay && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold">{currentDay.day}</p>
            <p className="text-accent font-bold">{Math.round(currentDay.total_calories)} kcal</p>
          </div>
          <MacroBar label="Proteine"    value={currentDay.total_protein_g} max={250} color="#6C63FF" />
          <MacroBar label="Carboidrati" value={currentDay.total_carbs_g}   max={400} color="#43D9AD" />
          <MacroBar label="Grassi"      value={currentDay.total_fat_g}     max={150} color="#FF6584" />
        </div>
      )}

      {/* Meal cards */}
      {currentMeals.map((m, i) => (
        <MealCard key={i} meal={m}
          selectedOption={selectedOptions[m.meal_name] ?? 0}
          onOptionChange={opt => setSelectedOptions(prev => ({ ...prev, [m.meal_name]: opt }))}
        />
      ))}

      {meal.notes && (
        <div className="card border-primary/20 bg-primary/5">
          <p className="text-sub text-sm">💡 {meal.notes}</p>
        </div>
      )}

      {/* Adaptive section */}
      <div className="card border-yellow-400/30 bg-yellow-400/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🔄</span>
          <h3 className="font-bold">Adatta il piano</h3>
        </div>
        <p className="text-sub text-xs mb-4 leading-relaxed">
          Hai sgarrato? Mangiato fuori? Saltato un pasto? Descrivilo — Claude calcola l'impatto e adatta il piano di domani.
        </p>

        {yazioConnected && yazioMeals.length > 0 && (
          <button onClick={autoFillFromYazio}
            className="w-full mb-3 py-2.5 rounded-xl border border-accent/50 text-accent text-sm font-semibold hover:bg-accent/10 transition-colors flex items-center justify-center gap-2">
            📲 Importa pasti reali da Yazio
          </button>
        )}

        <textarea
          className="input min-h-[90px] resize-none text-sm"
          placeholder={'Es: "Pizza a pranzo ~900 kcal, ho saltato la cena"\nEs: "Cena fuori: antipasto, pasta, dolce"\nEs: "Mangiato pochissimo, solo una mela"'}
          value={adaptReport}
          onChange={e => setAdaptReport(e.target.value)}
        />

        <button onClick={adaptPlan} disabled={adapting || !adaptReport.trim()} className="btn-primary w-full mt-3">
          {adapting
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Ricalcolo...</span>
            : '🧠 Adatta piano'}
        </button>

        {adaptedDay && (
          <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
            {adaptedDay.motivation && (
              <div className="rounded-xl bg-accent/10 border border-accent/30 p-3">
                <p className="text-accent text-sm font-medium">{adaptedDay.motivation}</p>
              </div>
            )}
            {adaptedDay.adjustment_reason && (
              <p className="text-muted text-xs italic">📊 {adaptedDay.adjustment_reason}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="font-bold">{adaptedDay.day}</p>
              <div className="flex gap-2">
                <MacroPill label="kcal" value={Math.round(adaptedDay.total_calories)} color="accent" />
                <MacroPill label="P" value={Math.round(adaptedDay.total_protein_g)} color="primary" />
              </div>
            </div>
            {adaptedDay.meals.map((m, i) => (
              <MealCard key={i} meal={m} selectedOption={0} onOptionChange={() => {}} />
            ))}
          </div>
        )}
      </div>

      {/* Yazio sync */}
      {yazioConnected && (
        <div className="card border-accent/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">🥗 Sincronizza su Yazio</h3>
              <p className="text-sub text-xs mt-0.5">Invia il piano pasti al tuo diario</p>
            </div>
            <button onClick={syncYazio} disabled={syncing}
              className="px-4 py-2 bg-accent text-bg rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {syncing ? '...' : 'Sync'}
            </button>
          </div>
          {syncMsg && <p className="text-sm mt-2">{syncMsg}</p>}
        </div>
      )}
    </div>
  );
}

// ─── MealCard ────────────────────────────────────────────────────────────────
function MealCard({ meal, selectedOption, onOptionChange }: {
  meal: Meal; selectedOption: number; onOptionChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const opts = meal.options ?? [];
  const active = opts[selectedOption];
  const foods = active?.foods ?? meal.foods ?? [];
  const kcal = active?.total_calories ?? meal.total_calories;
  const prot = active?.total_protein_g ?? meal.total_protein_g;
  const carb = active?.total_carbs_g ?? meal.total_carbs_g;
  const fat  = active?.total_fat_g ?? meal.total_fat_g;

  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
            {mealIcon(meal.meal_name)}
          </div>
          <div className="text-left">
            <p className="font-bold">{meal.meal_name}</p>
            {meal.time && <p className="text-muted text-xs">🕐 {meal.time}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary font-extrabold">{Math.round(kcal)}</span>
          <span className="text-muted text-xs">kcal</span>
          <span className="text-muted text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
          {opts.length > 1 && (
            <div className="flex gap-2 p-1 bg-surfaceB rounded-xl">
              {opts.map((opt: MealOption, i: number) => (
                <button key={i} onClick={() => onOptionChange(i)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedOption===i ? 'bg-primary text-white shadow-md' : 'text-sub hover:text-white'}`}>
                  {opt.option_name}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <MacroPill label="P" value={Math.round(prot)} color="primary" />
            <MacroPill label="C" value={Math.round(carb)} color="accent" />
            <MacroPill label="F" value={Math.round(fat)}  color="pink" />
          </div>

          <div className="space-y-1">
            {foods.map((f, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                <span className="text-sm">• {f.name}</span>
                <span className="text-muted text-xs">{f.amount} · {f.calories} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const bg: Record<string, string> = { accent: 'bg-accent/15 text-accent', primary: 'bg-primary/15 text-primary', yellow: 'bg-yellow-400/15 text-yellow-400' };
  return (
    <div className={`rounded-xl p-2.5 text-center ${bg[color] ?? 'bg-surfaceB text-sub'}`}>
      <p className="text-xs opacity-70 mb-0.5">{label}</p>
      <p className="font-extrabold text-lg leading-none">{value}</p>
    </div>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  const styles: Record<string, string> = {
    primary: 'bg-primary/15 text-primary',
    accent:  'bg-accent/15 text-accent',
    pink:    'bg-pink-500/15 text-pink-400',
  };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${styles[color] ?? 'bg-surfaceB text-sub'}`}>
      {label}: {value}g
    </span>
  );
}

function mealIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('colazione') || n.includes('breakfast')) return '☀️';
  if (n.includes('pranzo') || n.includes('lunch')) return '🍽️';
  if (n.includes('cena') || n.includes('dinner')) return '🌙';
  if (n.includes('spuntino') || n.includes('snack')) return '🍎';
  if (n.includes('pre') || n.includes('post')) return '💪';
  return '🥘';
}
