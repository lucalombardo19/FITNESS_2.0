'use client';
import { useState, useEffect } from 'react';

export default function Impostazioni() {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [usdaKey, setUsdaKey] = useState('');
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showUsda, setShowUsda] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(r => r.json())
      .then(d => { setAnthropicKey(d.anthropicKey ?? ''); setUsdaKey(d.usdaKey ?? ''); });
  }, []);

  const save = async () => {
    await fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anthropicKey: anthropicKey.trim(), usdaKey: usdaKey.trim() }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clear = async () => {
    if (!confirm('Cancellare profilo, piani e impostazioni?')) return;
    await Promise.all([
      fetch('/api/user/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: null }) }),
      fetch('/api/user/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: null }) }),
      fetch('/api/user/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anthropicKey: '', usdaKey: '' }) }),
    ]);
    setAnthropicKey(''); setUsdaKey('');
    alert('Dati cancellati.');
  };

  const Field = ({ label, value, onChange, show, onToggle, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-2">
        <input type={show ? 'text' : 'password'} className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        <button onClick={onToggle} className="px-4 bg-surfaceB border border-border rounded-xl text-lg hover:border-primary transition-colors">
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Impostazioni</h1>

      <div className="card space-y-4">
        <div>
          <h2 className="font-bold text-lg mb-1">🤖 Claude AI</h2>
          <p className="text-sub text-sm mb-3">Per generare piani alimentari e di allenamento</p>
        </div>
        <Field
          label="Anthropic API Key"
          value={anthropicKey}
          onChange={setAnthropicKey}
          show={showAnthropic}
          onToggle={() => setShowAnthropic(!showAnthropic)}
          placeholder="sk-ant-api03-..."
        />
        {anthropicKey
          ? <p className="text-accent text-xs">✓ Configurata</p>
          : <p className="text-muted text-xs">Ottieni su <span className="text-primary">console.anthropic.com</span></p>
        }

        <div className="border-t border-border pt-4">
          <h2 className="font-bold text-lg mb-1">🥦 USDA FoodData Central</h2>
          <p className="text-sub text-sm mb-3">Per dati nutrizionali certificati (gratuita)</p>
        </div>
        <Field
          label="USDA API Key"
          value={usdaKey}
          onChange={setUsdaKey}
          show={showUsda}
          onToggle={() => setShowUsda(!showUsda)}
          placeholder="Lascia vuoto per DEMO_KEY (30 req/ora)"
        />
        {usdaKey
          ? <p className="text-accent text-xs">✓ Configurata — ricerca illimitata</p>
          : <p className="text-yellow-400 text-xs">⚠️ Usando DEMO_KEY. Registrati su <span className="text-primary">fdc.nal.usda.gov</span> per la key gratuita.</p>
        }
      </div>

      <button onClick={save} className={`btn-primary w-full ${saved ? '!bg-accent' : ''}`}>
        {saved ? '✓ Salvate!' : 'Salva Impostazioni'}
      </button>

      <div className="card">
        <h2 className="font-bold text-lg mb-4">ℹ️ Informazioni</h2>
        {[['Versione','1.0.0'],['Framework','Next.js 14'],['AI','Claude (Anthropic)'],['Database','USDA FoodData Central'],['Storage','SQLite (server)']].map(([k,v]) => (
          <div key={k} className="flex justify-between py-2 border-b border-border last:border-0">
            <span className="text-sub text-sm">{k}</span>
            <span className="font-semibold text-sm">{v}</span>
          </div>
        ))}
      </div>

      <div className="card border-danger/30">
        <h2 className="font-bold text-lg text-danger mb-1">⚠️ Zona Pericolosa</h2>
        <p className="text-sub text-sm mb-4">Cancella i tuoi dati (profilo, piani, keys).</p>
        <button onClick={clear} className="w-full border border-danger text-danger font-bold py-3 rounded-xl hover:bg-danger/10 transition-colors">
          🗑️ Cancella i miei dati
        </button>
      </div>
    </div>
  );
}
