'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { KcalMode } from '@/lib/types';

export default function Piano() {
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);

  // Diet prefs
  const [genMeal, setGenMeal] = useState(true);
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [planDays, setPlanDays] = useState(3);
  const [kcalMode, setKcalMode] = useState<KcalMode>('auto');
  const [targetKcal, setTargetKcal] = useState(2000);
  const [kcalAdjustment, setKcalAdjustment] = useState(500);

  // Workout prefs
  const [genWorkout, setGenWorkout] = useState(true);
  const [restSeconds, setRestSeconds] = useState(90);
  const [sessionMinutes, setSessionMinutes] = useState(60);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'intense'>('moderate');

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => setHasProfile(!!d.profile));
    fetch('/api/user/settings').then(r => r.json()).then(d => setHasKey(!!d.anthropicKey));
    fetch('/api/user/plan').then(r => r.json()).then(d => setHasPlan(!!d.plan));
  }, []);

  const generate = async () => {
    setLoading(true); setError(''); setDone(false);
    setSteps(['🤖 Connessione a Claude AI...']);
    try {
      const res = await fetch('/api/piano', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genMeal, genWorkout,
          dietPrefs: { mealsPerDay, planDays, kcalMode, targetKcal: kcalMode === 'manual' ? targetKcal : undefined, kcalAdjustment },
          workoutPrefs: { restSeconds, sessionMinutes, intensity },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore generazione');
      setSteps(data.execution_steps ?? []);
      setDone(true); setHasPlan(true);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Errore sconosciuto');
      setSteps([]);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">⚡ Genera Piano</h1>
        <p className="text-sub text-sm mt-1">Personalizza e genera il tuo piano con Claude AI</p>
      </div>

      {/* Existing plan shortcuts */}
      {hasPlan && !loading && !done && (
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dieta" className="card hover:border-accent/50 transition-colors text-center py-4">
            <p className="text-2xl mb-1">🥗</p>
            <p className="font-bold text-sm">Vedi Dieta</p>
            <p className="text-muted text-xs">Piano attuale</p>
          </Link>
          <Link href="/allenamento" className="card hover:border-primary/50 transition-colors text-center py-4">
            <p className="text-2xl mb-1">🏋️</p>
            <p className="font-bold text-sm">Vedi Workout</p>
            <p className="text-muted text-xs">Piano attuale</p>
          </Link>
        </div>
      )}

      {/* Diet config */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">🥗 Piano Alimentare</h2>
            <p className="text-muted text-xs mt-0.5">Dieta personalizzata multi-giorno</p>
          </div>
          <Toggle value={genMeal} onChange={setGenMeal} />
        </div>

        {genMeal && (
          <div className="space-y-4 pt-2 border-t border-border">
            <Row label="Pasti al giorno">
              <Tabs options={[2,3,4,5,6]} value={mealsPerDay} onChange={setMealsPerDay} format={n => String(n)} />
            </Row>
            <Row label="Giorni di piano">
              <Tabs options={[1,3,5,7]} value={planDays} onChange={setPlanDays} format={n => `${n}g`} />
            </Row>
            <Row label="Calorie target">
              <div className="grid grid-cols-2 gap-2 w-full">
                {([
                  { v: 'auto',    e: '🤖', label: 'Auto' },
                  { v: 'deficit', e: '📉', label: 'Deficit' },
                  { v: 'surplus', e: '📈', label: 'Surplus' },
                  { v: 'manual',  e: '✏️', label: 'Manuale' },
                ] as { v: KcalMode; e: string; label: string }[]).map(opt => (
                  <button key={opt.v} onClick={() => setKcalMode(opt.v)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${kcalMode === opt.v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-sub hover:border-primary/40'}`}>
                    {opt.e} {opt.label}
                  </button>
                ))}
              </div>
            </Row>
            {kcalMode === 'deficit' && (
              <Row label={`Deficit (≈${(kcalAdjustment/1000).toFixed(1)} kg/10gg)`}>
                <Tabs options={[300,400,500,600]} value={kcalAdjustment} onChange={setKcalAdjustment} format={n => `-${n}`} color="danger" />
              </Row>
            )}
            {kcalMode === 'surplus' && (
              <Row label="Surplus giornaliero">
                <Tabs options={[150,250,350,500]} value={kcalAdjustment} onChange={setKcalAdjustment} format={n => `+${n}`} color="accent" />
              </Row>
            )}
            {kcalMode === 'manual' && (
              <Row label="Kcal / giorno">
                <div className="flex items-center gap-2">
                  <input type="number" min={800} max={6000} step={50}
                    className="input text-center font-bold text-lg w-32"
                    value={targetKcal} onChange={e => setTargetKcal(parseInt(e.target.value) || 2000)} />
                  <span className="text-sub text-sm">kcal</span>
                </div>
              </Row>
            )}
          </div>
        )}
      </div>

      {/* Workout config */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">🏋️ Piano Allenamento</h2>
            <p className="text-muted text-xs mt-0.5">Scheda con progressive overload</p>
          </div>
          <Toggle value={genWorkout} onChange={setGenWorkout} />
        </div>

        {genWorkout && (
          <div className="space-y-4 pt-2 border-t border-border">
            <Row label="Durata sessione">
              <Tabs options={[30,45,60,90]} value={sessionMinutes} onChange={setSessionMinutes} format={n => `${n}min`} />
            </Row>
            <Row label="Riposo tra serie">
              <Tabs options={[30,60,90,120,180]} value={restSeconds} onChange={setRestSeconds} format={n => `${n}s`} />
            </Row>
            <Row label="Intensità">
              <Tabs
                options={['light','moderate','intense'] as typeof intensity[]}
                value={intensity} onChange={setIntensity}
                format={v => v === 'light' ? '🟢 Leggera' : v === 'moderate' ? '🟡 Moderata' : '🔴 Intensa'}
              />
            </Row>
          </div>
        )}
      </div>

      {/* Warnings */}
      {!hasProfile && <p className="text-center text-yellow-400 text-sm">⚠️ <Link href="/profilo" className="underline">Configura il profilo</Link> prima di generare</p>}
      {!hasKey && <p className="text-center text-danger text-sm">⚠️ <Link href="/impostazioni" className="underline">Aggiungi la API Key</Link> nelle impostazioni</p>}

      {/* Generate button */}
      <button onClick={generate} disabled={loading || !hasProfile || !hasKey} className="btn-primary w-full py-4 text-base font-extrabold">
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generazione in corso...
            </span>
          : '🚀 Genera Piano Personalizzato'}
      </button>

      {/* Loading steps */}
      {loading && steps.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-bold text-sm">🔄 Agenti Claude al lavoro...</h3>
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <p className="text-sub text-sm">{s}</p>
            </div>
          ))}
          <p className="text-muted text-xs italic pt-1">30-90 secondi per piani multi-giorno...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-danger/40 bg-danger/5">
          <p className="font-bold text-danger mb-1">❌ Errore</p>
          <p className="text-sm text-sub">{error}</p>
        </div>
      )}

      {/* Done → go to pages */}
      {done && (
        <div className="card border-accent/30 bg-accent/5 space-y-3">
          <p className="font-bold text-accent text-center">✅ Piano generato con successo!</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dieta" className="block text-center py-3 rounded-xl bg-accent text-bg font-bold text-sm hover:opacity-90 transition-opacity">
              🥗 Vai alla Dieta
            </Link>
            <Link href="/allenamento" className="block text-center py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity">
              🏋️ Vai all&apos;Allenamento
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${value ? 'bg-primary' : 'bg-border'}`}>
      <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 shadow transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-sub">{label}</p>
      {children}
    </div>
  );
}

function Tabs<T extends string | number>({ options, value, onChange, format, color }: {
  options: T[]; value: T; onChange: (v: T) => void;
  format: (v: T) => string; color?: string;
}) {
  const active = color === 'danger' ? 'bg-danger/80 text-white' : color === 'accent' ? 'bg-accent text-bg' : 'bg-primary text-white';
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button key={String(o)} onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${value === o ? active : 'bg-border text-sub hover:bg-border/80'}`}>
          {format(o)}
        </button>
      ))}
    </div>
  );
}
