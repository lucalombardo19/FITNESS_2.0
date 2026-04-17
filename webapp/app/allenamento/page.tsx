'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { WorkoutPlan, WorkoutSession, Exercise, ExerciseAlternative, ExerciseSetLog } from '@/lib/types';

export default function Allenamento() {
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [logHistory, setLogHistory] = useState<{ id: number; date: string; exercise_name: string; sets: ExerciseSetLog[] }[]>([]);

  // Workout logging state
  const [loggingEx, setLoggingEx] = useState<{ name: string; focus: string } | null>(null);
  const [logSets, setLogSets] = useState<{ reps: string; weight: string }[]>([{ reps: '', weight: '' }]);
  const [savingLog, setSavingLog] = useState(false);
  const [logMsg, setLogMsg] = useState('');
  const [showAlts, setShowAlts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/user/plan').then(r => r.json()).then(d => {
      setWorkout(d.plan?.workout_plan ?? null);
      setLoading(false);
    });
    fetch('/api/user/workout-log').then(r => r.json()).then(d => setLogHistory(d.logs?.slice(0, 10) ?? []));
  }, []);

  const saveLog = async () => {
    if (!loggingEx) return;
    const sets = logSets.filter(s => s.reps).map(s => ({
      reps: parseInt(s.reps),
      weight_kg: s.weight ? parseFloat(s.weight) : undefined,
    }));
    if (!sets.length) return;
    setSavingLog(true);
    const res = await fetch('/api/user/workout-log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exercise_name: loggingEx.name, session_focus: loggingEx.focus, sets, date: new Date().toISOString().slice(0, 10) }),
    });
    setSavingLog(false);
    if (res.ok) {
      setLogMsg('✅ Salvato! Usato per il progressive overload al prossimo piano.');
      setLoggingEx(null); setLogSets([{ reps: '', weight: '' }]);
      // Refresh history
      fetch('/api/user/workout-log').then(r => r.json()).then(d => setLogHistory(d.logs?.slice(0, 10) ?? []));
      setTimeout(() => setLogMsg(''), 5000);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sub text-sm">Caricamento...</p>
    </div>
  );

  if (!workout) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="text-6xl mb-4">🏋️</div>
      <h2 className="text-xl font-bold mb-2">Nessun piano allenamento</h2>
      <p className="text-sub text-sm mb-6">Genera il tuo programma personalizzato con Claude AI</p>
      <Link href="/piano" className="btn-primary inline-block px-8">⚡ Genera Piano</Link>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-extrabold">🏋️ Allenamento</h1>
            <p className="text-sub text-sm mt-0.5">{workout.sessions?.length} sessioni/settimana</p>
          </div>
          <Link href="/piano" className="text-primary text-sm font-semibold bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors">
            ↺ Rigenera
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatBadge icon="📅" label="Sessioni" value={String(workout.sessions?.length ?? 0)} />
          <StatBadge icon="⏱️" label="Durata" value={`${workout.sessions?.[0]?.duration_minutes ?? '—'}min`} />
          <StatBadge icon="💤" label="Riposo" value={`${workout.sessions?.[0]?.rest_between_sets ?? '—'}s`} />
        </div>
      </div>

      {/* Log success message */}
      {logMsg && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-accent text-sm font-semibold">{logMsg}</p>
        </div>
      )}

      {/* Sessions */}
      {workout.sessions?.map((s, i) => (
        <SessionCard key={i} session={s}
          loggingEx={loggingEx}
          onStartLog={(name, focus) => { setLoggingEx({ name, focus }); setLogSets([{ reps: '', weight: '' }]); }}
          onStopLog={() => setLoggingEx(null)}
          logSets={logSets}
          onSetChange={setLogSets}
          onSaveLog={saveLog}
          savingLog={savingLog}
          showAlts={showAlts}
          onToggleAlt={name => setShowAlts(prev => ({ ...prev, [name]: !prev[name] }))}
        />
      ))}

      {/* Progression notes */}
      {workout.progression_notes && (
        <div className="card border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📈</span>
            <h3 className="font-bold">Progressione</h3>
          </div>
          <p className="text-sub text-sm leading-relaxed">{workout.progression_notes}</p>
        </div>
      )}

      {/* Log history */}
      {logHistory.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3">🗂️ Ultimi allenamenti registrati</h3>
          <div className="space-y-2">
            {logHistory.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <div>
                  <p className="text-sm font-semibold">{log.exercise_name}</p>
                  <p className="text-muted text-xs">{log.sets.length} serie · {new Date(log.date + 'T00:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right">
                  {log.sets.map((s, i) => (
                    <span key={i} className="text-xs text-sub">
                      {i > 0 && ' | '}{s.reps}×{s.weight_kg ? `${s.weight_kg}kg` : 'BW'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted text-xs mt-3 text-center">Usati automaticamente per il progressive overload</p>
        </div>
      )}
    </div>
  );
}

// ─── SessionCard ──────────────────────────────────────────────────────────────
function SessionCard({ session, loggingEx, onStartLog, onStopLog, logSets, onSetChange, onSaveLog, savingLog, showAlts, onToggleAlt }: {
  session: WorkoutSession;
  loggingEx: { name: string; focus: string } | null;
  onStartLog: (name: string, focus: string) => void;
  onStopLog: () => void;
  logSets: { reps: string; weight: string }[];
  onSetChange: (s: { reps: string; weight: string }[]) => void;
  onSaveLog: () => void;
  savingLog: boolean;
  showAlts: Record<string, boolean>;
  onToggleAlt: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
            {focusIcon(session.focus)}
          </div>
          <div className="text-left">
            <p className="font-extrabold">{session.day}</p>
            <p className="text-sub text-sm">{session.focus}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session.duration_minutes && (
            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg">{session.duration_minutes}min</span>
          )}
          <span className="text-muted">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
          {session.exercises?.map((ex, i) => {
            const altKey = `${session.focus}|${ex.name}`;
            const isLogging = loggingEx?.name === ex.name && loggingEx?.focus === session.focus;
            return (
              <ExerciseCard key={i} exercise={ex} altKey={altKey} isLogging={isLogging}
                onStartLog={() => onStartLog(ex.name, session.focus)}
                onStopLog={onStopLog}
                logSets={logSets} onSetChange={onSetChange}
                onSaveLog={onSaveLog} savingLog={savingLog}
                showAlt={showAlts[altKey] ?? false}
                onToggleAlt={() => onToggleAlt(altKey)}
              />
            );
          })}
          {session.notes && <p className="text-sub text-sm italic pt-1">💡 {session.notes}</p>}
        </div>
      )}
    </div>
  );
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise: ex, altKey, isLogging, onStartLog, onStopLog, logSets, onSetChange, onSaveLog, savingLog, showAlt, onToggleAlt }: {
  exercise: Exercise; altKey: string; isLogging: boolean;
  onStartLog: () => void; onStopLog: () => void;
  logSets: { reps: string; weight: string }[]; onSetChange: (s: { reps: string; weight: string }[]) => void;
  onSaveLog: () => void; savingLog: boolean;
  showAlt: boolean; onToggleAlt: () => void;
}) {
  return (
    <div className={`rounded-xl border transition-all ${isLogging ? 'border-primary/40 bg-primary/5' : 'border-border bg-surfaceB'} p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-semibold text-sm">💪 {ex.name}</p>
          {ex.weight_suggestion && (
            <p className="text-primary text-xs mt-0.5 font-medium">⚖️ {ex.weight_suggestion}</p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {ex.alternatives && ex.alternatives.length > 0 && (
            <button onClick={onToggleAlt}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${showAlt ? 'border-accent/50 text-accent bg-accent/10' : 'border-border text-sub hover:border-accent/40'}`}>
              Alt.
            </button>
          )}
          <button onClick={isLogging ? onStopLog : onStartLog}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${isLogging ? 'bg-danger/15 text-danger border border-danger/30' : 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25'}`}>
            {isLogging ? '✕ Chiudi' : '+ Log'}
          </button>
        </div>
      </div>

      {/* Chips */}
      <div className="flex gap-1.5 flex-wrap">
        {ex.sets && <Chip>{ex.sets} serie</Chip>}
        {ex.reps && <Chip>{ex.reps} rip</Chip>}
        {ex.rest && <Chip>💤 {ex.rest}</Chip>}
      </div>

      {ex.notes && <p className="text-muted text-xs italic">{ex.notes}</p>}

      {/* Alternatives */}
      {showAlt && ex.alternatives && (
        <div className="pt-2 border-t border-border/50 space-y-1.5">
          <p className="text-xs text-sub font-semibold">Alternative:</p>
          {ex.alternatives.map((alt: ExerciseAlternative, j: number) => (
            <div key={j} className="flex items-center gap-2 text-xs bg-surfaceB rounded-lg px-2.5 py-1.5">
              <span className="text-muted">→</span>
              <span className="font-medium flex-1">{alt.name}</span>
              <span className="text-muted">{alt.sets}×{alt.reps}</span>
            </div>
          ))}
        </div>
      )}

      {/* Inline logger */}
      {isLogging && (
        <div className="pt-2 border-t border-border/50 space-y-2">
          <p className="text-xs font-semibold text-sub">Registra oggi:</p>
          {logSets.map((s, si) => (
            <div key={si} className="flex gap-2 items-center">
              <span className="text-muted text-xs w-14 flex-shrink-0">Serie {si + 1}</span>
              <input type="number" placeholder="Rip" min="1" max="100"
                className="input py-1.5 text-center text-sm flex-1" value={s.reps}
                onChange={e => { const n = [...logSets]; n[si] = { ...n[si], reps: e.target.value }; onSetChange(n); }} />
              <input type="number" placeholder="kg" min="0" max="500" step="0.5"
                className="input py-1.5 text-center text-sm flex-1" value={s.weight}
                onChange={e => { const n = [...logSets]; n[si] = { ...n[si], weight: e.target.value }; onSetChange(n); }} />
              {logSets.length > 1 && (
                <button onClick={() => onSetChange(logSets.filter((_, idx) => idx !== si))} className="text-muted hover:text-danger text-xs px-1">✕</button>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onSetChange([...logSets, { reps: '', weight: '' }])}
              className="flex-1 py-2 rounded-xl border border-border text-sub text-xs font-semibold hover:border-primary/40 transition-colors">
              + Serie
            </button>
            <button onClick={onSaveLog} disabled={savingLog}
              className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
              {savingLog ? '...' : '💾 Salva'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-2.5 text-center">
      <p className="text-lg mb-0.5">{icon}</p>
      <p className="font-extrabold text-base leading-none">{value}</p>
      <p className="text-xs text-sub mt-0.5">{label}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="bg-border text-sub text-xs font-medium px-2.5 py-1 rounded-lg">{children}</span>;
}

function focusIcon(focus: string): string {
  const f = focus.toLowerCase();
  if (f.includes('petto') || f.includes('chest')) return '🔵';
  if (f.includes('schiena') || f.includes('back')) return '🟤';
  if (f.includes('gambe') || f.includes('leg')) return '🟢';
  if (f.includes('spalle') || f.includes('shoulder')) return '🟡';
  if (f.includes('braccia') || f.includes('arm') || f.includes('bicep') || f.includes('tricep')) return '🟠';
  if (f.includes('cardio') || f.includes('run')) return '❤️';
  if (f.includes('full') || f.includes('total')) return '⭐';
  return '💪';
}
