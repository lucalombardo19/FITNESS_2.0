'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import type { UserProfile, FitnessPlan, Meal } from '@/lib/types';

export default function Home() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [yazioMeals, setYazioMeals] = useState<Meal[]>([]);
  const [yazioConnected, setYazioConnected] = useState(false);

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => setProfile(d.profile));
    fetch('/api/user/plan').then(r => r.json()).then(d => setPlan(d.plan));
    fetch('/api/user/settings').then(r => r.json()).then(d => setHasKey(!!d.anthropicKey));
    fetch('/api/yazio/diary').then(r => r.json()).then(d => {
      if (d.connected) { setYazioConnected(true); setYazioMeals(d.meals ?? []); }
    });
  }, []);

  const goalLabel: Record<string, string> = {
    cut: 'Definizione', bulk: 'Massa', maintenance: 'Mantenimento', recomp: 'Ricomposizione',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">
          Ciao{session?.user?.name ? `, ${session.user.name}` : ''} 👋
        </h1>
        <p className="text-sub mt-1">Il tuo piano fitness con Claude AI</p>
      </div>

      {/* Status */}
      <div className="card flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${hasKey ? 'bg-accent' : 'bg-danger'}`} />
        <div>
          <p className="font-semibold text-sm">{hasKey ? 'Claude AI configurato' : 'API Key mancante'}</p>
          <p className="text-muted text-xs">{hasKey ? 'Pronto a generare piani' : 'Vai su Impostazioni'}</p>
        </div>
        {!hasKey && <Link href="/impostazioni" className="ml-auto text-primary text-sm font-semibold">Configura →</Link>}
      </div>

      {/* Profile */}
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
          <div className="mt-3 flex gap-2 flex-wrap">
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
          <Link href="/profilo" className="btn-primary inline-block mt-4 text-sm">Configura profilo</Link>
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
          <p className="text-muted text-xs mt-1">Database USDA certificato</p>
        </Link>
      </div>

      {/* Last plan */}
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

      {/* Yazio diary */}
      {yazioConnected && (
        <div className="card border-accent/30 bg-accent/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold">🥗 Diario Yazio oggi</h2>
              <p className="text-muted text-xs mt-0.5">Pasti registrati</p>
            </div>
            <Link href="/impostazioni" className="text-accent text-sm font-semibold">Gestisci →</Link>
          </div>
          {yazioMeals.length > 0 ? (
            <div className="space-y-2">
              {yazioMeals.slice(0, 3).map((m: Meal, i: number) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium">{m.meal_name}</span>
                  <span className="text-accent text-xs font-semibold">{Math.round(m.total_calories)} kcal</span>
                </div>
              ))}
              {yazioMeals.length > 3 && <p className="text-muted text-xs text-center pt-1">+{yazioMeals.length - 3} altri pasti</p>}
            </div>
          ) : (
            <p className="text-sub text-sm text-center py-3">Nessun pasto registrato oggi</p>
          )}
        </div>
      )}
    </div>
  );
}
