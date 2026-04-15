'use client';
import { useState, useEffect } from 'react';
import type { UserProfile, ActivityLevel, FitnessGoal } from '@/lib/types';
import MacroBar from '@/components/MacroBar';

const GOALS = [
  { value: 'cut',         label: 'Definizione',    icon: '🔥', desc: 'Perdere grasso' },
  { value: 'bulk',        label: 'Massa',           icon: '💪', desc: 'Aumentare muscoli' },
  { value: 'maintenance', label: 'Mantenimento',    icon: '⚖️', desc: 'Mantenere il peso' },
  { value: 'recomp',      label: 'Ricomposizione',  icon: '🔄', desc: 'Grasso → Muscoli' },
];
const ACTIVITY = [
  { value: 'sedentary',         label: 'Sedentario',           desc: 'Poco o nessun esercizio' },
  { value: 'lightly_active',    label: 'Leggermente attivo',   desc: '1-3 gg/settimana' },
  { value: 'moderately_active', label: 'Moderatamente attivo', desc: '3-5 gg/settimana' },
  { value: 'very_active',       label: 'Molto attivo',         desc: '6-7 gg/settimana' },
  { value: 'extra_active',      label: 'Estremamente attivo',  desc: 'Lavoro fisico intenso' },
];
const EQUIPMENT = { bodyweight:'A corpo libero', dumbbells:'Manubri', barbell:'Bilanciere', resistance_bands:'Elastici', pull_up_bar:'Sbarra', gym_access:'Palestra' };
const DIETARY   = { vegetarian:'Vegetariano', vegan:'Vegano', keto:'Keto', paleo:'Paleo', mediterranean:'Mediterranea', low_carb:'Low Carb' };
const ALLERGIES = { dairy:'Latticini', gluten:'Glutine', nuts:'Frutta secca', shellfish:'Crostacei', eggs:'Uova', soy:'Soia' };
const DEFAULT: UserProfile = { age:25, weight_kg:75, height_cm:175, goal_weight_kg:undefined, activity_level:'moderately_active', fitness_goal:'maintenance', weekly_workout_frequency:3, allergies:[], dietary_preferences:[], available_equipment:['bodyweight'] };

export default function Profilo() {
  const [p, setP] = useState<UserProfile>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [macros, setMacros] = useState<{kcal:number;prot:number;carbs:number;fat:number}|null>(null);

  useEffect(() => {
    fetch('/api/user/profile').then(r => r.json()).then(d => {
      if (d.profile) setP(d.profile);
      setLoading(false);
    });
  }, []);

  const update = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => setP(prev => ({ ...prev, [k]: v }));
  const toggleArr = (key: 'allergies'|'dietary_preferences'|'available_equipment', val: string) =>
    setP(prev => { const arr = prev[key] as string[]; return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }; });

  const save = async () => {
    await fetch('/api/user/profile', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ profile: p }) });
    const mult: Record<string,number> = { sedentary:1.2, lightly_active:1.375, moderately_active:1.55, very_active:1.725, extra_active:1.9 };
    const bmr = 10*p.weight_kg + 6.25*p.height_cm - 5*p.age + 5;
    let kcal = bmr * (mult[p.activity_level] ?? 1.55);
    if (p.fitness_goal==='cut') kcal -= 400; else if (p.fitness_goal==='bulk') kcal += 300;
    const prot = p.weight_kg * 2.2;
    const fat = (kcal*0.25)/9;
    const carbs = (kcal - prot*4 - fat*9)/4;
    setMacros({ kcal:Math.round(kcal), prot:Math.round(prot), carbs:Math.round(carbs), fat:Math.round(fat) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin text-4xl">⚙️</div></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Il tuo Profilo</h1>

      <div className="card">
        <h2 className="font-bold mb-4">📏 Dati Fisici</h2>
        <div className="grid grid-cols-3 gap-3">
          {[{label:'Età',key:'age',min:16,max:80},{label:'Peso (kg)',key:'weight_kg',min:30,max:300},{label:'Altezza (cm)',key:'height_cm',min:100,max:250}].map(({label,key,min,max}) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="number" className="input text-center text-lg font-bold" value={p[key as keyof UserProfile] as number} min={min} max={max}
                onChange={e => update(key as keyof UserProfile, parseFloat(e.target.value) as UserProfile[keyof UserProfile])} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="label">Peso obiettivo (kg) — opzionale</label>
          <input type="number" step="0.5" min="30" max="300" className="input" placeholder="es. 70"
            value={p.goal_weight_kg ?? ''} onChange={e => update('goal_weight_kg', e.target.value ? parseFloat(e.target.value) : undefined as unknown as number)} />
          <p className="text-muted text-xs mt-1">Usato nella pagina Progressi per mostrare la distanza dall'obiettivo</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-4">🎯 Obiettivo</h2>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(g => (
            <button key={g.value} onClick={() => update('fitness_goal', g.value as FitnessGoal)}
              className={`p-4 rounded-xl border text-left transition-all ${p.fitness_goal===g.value ? 'border-primary bg-primary/10' : 'border-border bg-surfaceB hover:border-primary/50'}`}>
              <span className="text-2xl">{g.icon}</span>
              <p className={`font-bold mt-1 ${p.fitness_goal===g.value ? 'text-primary' : ''}`}>{g.label}</p>
              <p className="text-muted text-xs">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-4">⚡ Livello di Attività</h2>
        <div className="space-y-2">
          {ACTIVITY.map(a => (
            <button key={a.value} onClick={() => update('activity_level', a.value as ActivityLevel)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${p.activity_level===a.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${p.activity_level===a.value ? 'border-primary bg-primary' : 'border-sub'}`} />
              <div>
                <p className={`font-semibold text-sm ${p.activity_level===a.value ? 'text-primary' : ''}`}>{a.label}</p>
                <p className="text-muted text-xs">{a.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-4">📅 Allenamenti / Settimana</h2>
        <div className="flex gap-2">
          {[1,2,3,4,5,6,7].map(n => (
            <button key={n} onClick={() => update('weekly_workout_frequency', n)}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${p.weekly_workout_frequency===n ? 'bg-primary text-white' : 'bg-surfaceB text-sub hover:bg-border'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {([{title:'🏋️ Attrezzatura',key:'available_equipment' as const,map:EQUIPMENT},{title:'🥗 Preferenze Dietetiche',key:'dietary_preferences' as const,map:DIETARY},{title:'⚠️ Allergie',key:'allergies' as const,map:ALLERGIES}]).map(({title,key,map}) => (
        <div key={key} className="card">
          <h2 className="font-bold mb-3">{title}</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(map).map(([val,label]) => {
              const active = (p[key] as string[]).includes(val);
              return <button key={val} onClick={() => toggleArr(key, val)} className={`chip ${active ? 'bg-primary/20 border-primary text-primary' : 'bg-surfaceB border-border text-sub hover:border-primary/50'}`}>{label}</button>;
            })}
          </div>
        </div>
      ))}

      {macros && (
        <div className="card border-accent/30 bg-accent/5">
          <h2 className="font-bold mb-4">📊 Target Nutrizionali Stimati</h2>
          <div className="flex items-end gap-1 mb-5">
            <span className="text-5xl font-extrabold text-accent">{macros.kcal}</span>
            <span className="text-sub mb-2">kcal/giorno</span>
          </div>
          <MacroBar label="Proteine"    value={macros.prot}  max={250} color="#6C63FF" />
          <MacroBar label="Carboidrati" value={macros.carbs} max={400} color="#43D9AD" />
          <MacroBar label="Grassi"      value={macros.fat}   max={150} color="#FF6584" />
        </div>
      )}

      <button onClick={save} className={`btn-primary w-full text-lg ${saved ? '!bg-accent' : ''}`}>
        {saved ? '✓ Profilo Salvato!' : 'Salva Profilo'}
      </button>
    </div>
  );
}
