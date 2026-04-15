'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UserProfile, FitnessPlan } from '@/lib/types';

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const p = localStorage.getItem('fitness_profile');
    const pl = localStorage.getItem('fitness_plan');
    const k = localStorage.getItem('fitness_api_key');
    if (p) setProfile(JSON.parse(p));
    if (pl) setPlan(JSON.parse(pl));
    if (k) setApiKey(k);
  }, []);

  const goalLabel: Record<string, string> = {
    cut: 'Definizione', bulk: 'Massa', maintenance: 'Mantenimento', recomp: 'Ricomposizione',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">AI Fitness Planner</h1>
        <p className="text-sub mt-1">Il tuo piano personalizzato con Claude AI</p>
      </div>

      {/* Status */}
      <div className="card flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${apiKey ? 'bg-accent' : 'bg-danger'} shadow-lg`} />
        <div>
          <p className="font-semibold text-sm">{apiKey ? 'Claude AI configurato' : 'API Key mancante'}</p>
          <p className="text-muted text-xs">{apiKey ? 'Pronto a generare piani' : 'Vai su Impostazioni per configurarla'}</p>
        </div>
        {!apiKey && (
          <Link href="/impostazioni" className="ml-auto text-primary text-sm font-semibold">Configura →</Link>
        )}
      </div>

      {/* Profile summary */}
      {profile ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Il tuo profilo</h2>
            <Link href="/profilo" className="text-primary text-sm">Modifica</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Età', value: `${profile.age} anni` },
              { label: 'Peso', value: `${profile.weight_kg} kg` },
              { label: 'Altezza', value: `${profile.height_cm} cm` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surfaceB rounded-xl p-3 text-center">
                <p className="text-sub text-xs">{label}</p>
                <p className="font-bold text-lg mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <span className="bg-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full">
              {goalLabel[profile.fitness_goal] ?? profile.fitness_goal}
            </span>
            <span className="bg-surfaceB text-sub text-xs font-medium px-3 py-1 rounded-full">
              {profile.weekly_workout_frequency}x/settimana
            </span>
          </div>
        </div>
      ) : (
        <div className="card border-dashed text-center py-8">
          <p className="text-4xl mb-3">👤</p>
          <p className="font-semibold text-sub">Profilo non configurato</p>
          <Link href="/profilo" className="btn-primary inline-block mt-4 text-sm">
            Configura profilo
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/piano" className="card hover:border-primary transition-colors text-center py-6">
          <p className="text-3xl mb-2">⚡</p>
          <p className="font-bold">Genera Piano</p>
          <p className="text-muted text-xs mt-1">Alimentare + Allenamento</p>
        </Link>
        <Link href="/cerca" className="card hover:border-accent transition-colors text-center py-6">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-bold">Cerca Alimenti</p>
          <p className="text-muted text-xs mt-1">Database nutrizionale AI</p>
        </Link>
      </div>

      {/* Last plan summary */}
      {plan?.summary && (
        <div className="card border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Ultimo piano generato</h2>
            <Link href="/piano" className="text-primary text-sm">Vedi →</Link>
          </div>
          <p className="text-sub text-sm leading-relaxed">{plan.summary}</p>
          {plan.timestamp && (
            <p className="text-muted text-xs mt-3">
              {new Date(plan.timestamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
