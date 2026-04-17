'use client';
import { useState, useEffect } from 'react';
import type { UserProfile } from '@/lib/types';

type WeightEntry = { id: number; weight_kg: number; date: string; notes: string | null };

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sorted.map(e => e.weight_kg);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 1;
  const W = 320, H = 100, PAD = 10;
  const points = sorted.map((e, i) => {
    const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((e.weight_kg - min) / range) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      <polyline points={points} fill="none" stroke="#6C63FF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {sorted.map((e, i) => {
        const x = PAD + (i / (sorted.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((e.weight_kg - min) / range) * (H - PAD * 2);
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#6C63FF" />;
      })}
      <text x={PAD} y={H - 2} fontSize="9" fill="#888">{sorted[0].date.slice(5)}</text>
      <text x={W - PAD} y={H - 2} fontSize="9" fill="#888" textAnchor="end">{sorted[sorted.length - 1].date.slice(5)}</text>
      <text x={PAD} y={14} fontSize="9" fill="#43D9AD">{max.toFixed(1)}</text>
      <text x={PAD} y={H - PAD + 2} fontSize="9" fill="#43D9AD">{min.toFixed(1)}</text>
    </svg>
  );
}

export default function Progressi() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    fetch('/api/user/progress').then(r => r.json()).then(d => setEntries(d.entries ?? []));
    fetch('/api/user/profile').then(r => r.json()).then(d => setProfile(d.profile));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const kg = parseFloat(weight);
    if (!kg || kg < 20 || kg > 500) { setMsg('Inserisci un peso valido'); return; }
    setSaving(true); setMsg('');
    const res = await fetch('/api/user/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight_kg: kg, date, notes }),
    });
    if (res.ok) { setMsg('✅ Salvato!'); setWeight(''); setNotes(''); load(); }
    else { const d = await res.json(); setMsg(`❌ ${d.error}`); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const remove = async (id: number) => {
    await fetch('/api/user/progress', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0]?.weight_kg;
  const prev = sorted[1]?.weight_kg;
  const diff = latest && prev ? latest - prev : null;
  const goalWeight = profile?.goal_weight_kg;
  const distGoal = latest && goalWeight ? latest - goalWeight : null;

  const bmi = latest && profile ? latest / Math.pow(profile.height_cm / 100, 2) : null;
  const bmiLabel = bmi
    ? bmi < 18.5 ? 'Sottopeso' : bmi < 25 ? 'Normopeso' : bmi < 30 ? 'Sovrappeso' : 'Obeso'
    : null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">📈 Progressi</h1>

      {/* Log form */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">Registra peso</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Peso (kg)</label>
              <input
                type="number" step="0.1" min="20" max="500"
                className="input" placeholder="75.5"
                value={weight} onChange={e => setWeight(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="label">Data</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Note (opzionale)</label>
            <input className="input" placeholder="es. dopo allenamento..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {msg && <p className="text-sm">{msg}</p>}
          <button onClick={save} disabled={saving || !weight} className="btn-primary w-full">
            {saving ? 'Salvataggio...' : '💾 Salva peso'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-muted text-xs mb-1">Peso attuale</p>
            <p className="text-3xl font-extrabold text-primary">{latest.toFixed(1)}</p>
            <p className="text-sub text-sm">kg</p>
            {diff !== null && (
              <p className={`text-xs mt-1 font-semibold ${diff < 0 ? 'text-accent' : diff > 0 ? 'text-danger' : 'text-muted'}`}>
                {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg dall'ultima
              </p>
            )}
          </div>
          {goalWeight ? (
            <div className="card text-center">
              <p className="text-muted text-xs mb-1">Obiettivo</p>
              <p className="text-3xl font-extrabold text-accent">{goalWeight.toFixed(1)}</p>
              <p className="text-sub text-sm">kg</p>
              {distGoal !== null && (
                <p className={`text-xs mt-1 font-semibold ${Math.abs(distGoal) < 0.5 ? 'text-accent' : 'text-muted'}`}>
                  {distGoal > 0 ? '-' : '+'}{Math.abs(distGoal).toFixed(1)} kg al goal
                </p>
              )}
            </div>
          ) : (
            <div className="card text-center">
              <p className="text-muted text-xs mb-1">BMI</p>
              <p className="text-3xl font-extrabold">{bmi ? bmi.toFixed(1) : '—'}</p>
              <p className={`text-xs mt-1 font-semibold ${bmiLabel === 'Normopeso' ? 'text-accent' : 'text-yellow-400'}`}>{bmiLabel ?? ''}</p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {entries.length >= 2 && (
        <div className="card">
          <h2 className="font-bold mb-3">Andamento peso</h2>
          <WeightChart entries={entries} />
          {goalWeight && (
            <p className="text-muted text-xs mt-2 text-center">Goal: {goalWeight} kg</p>
          )}
        </div>
      )}

      {/* History */}
      {sorted.length > 0 ? (
        <div className="card">
          <h2 className="font-bold mb-3">Storico ({sorted.length} misurazioni)</h2>
          <div className="space-y-0">
            {sorted.map((e, i) => {
              const nextWeight = sorted[i + 1]?.weight_kg;
              const delta = nextWeight ? e.weight_kg - nextWeight : null;
              return (
                <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-semibold text-sm">{e.weight_kg.toFixed(1)} kg</p>
                    {e.notes && <p className="text-muted text-xs">{e.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sub text-xs">{new Date(e.date + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p>
                      {delta !== null && (
                        <p className={`text-xs font-semibold ${delta < 0 ? 'text-accent' : delta > 0 ? 'text-danger' : 'text-muted'}`}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                        </p>
                      )}
                    </div>
                    <button onClick={() => remove(e.id)} className="text-muted text-xs hover:text-danger transition-colors px-1">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card text-center py-10">
          <p className="text-4xl mb-3">⚖️</p>
          <p className="font-semibold text-sub">Nessuna misurazione ancora</p>
          <p className="text-muted text-xs mt-1">Registra il tuo peso oggi per iniziare a tracciare i progressi</p>
        </div>
      )}
    </div>
  );
}
