'use client';
import { useState, useEffect } from 'react';

export default function Impostazioni() {
  const [key, setKey] = useState('');
  const [usdaKey, setUsdaKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showUsda, setShowUsda] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(localStorage.getItem('fitness_api_key') ?? '');
    setUsdaKey(localStorage.getItem('fitness_usda_key') ?? '');
  }, []);

  const save = () => {
    localStorage.setItem('fitness_api_key', key.trim());
    localStorage.setItem('fitness_usda_key', usdaKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clear = () => {
    if (confirm('Cancellare tutti i dati salvati?')) {
      localStorage.clear();
      setKey(''); setUsdaKey('');
      alert('Dati cancellati.');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Impostazioni</h1>

      {/* Claude API Key */}
      <div className="card">
        <h2 className="font-bold text-lg mb-1">🤖 Claude AI</h2>
        <p className="text-sub text-sm mb-4">Per generare piani alimentari e di allenamento</p>
        <label className="label">Anthropic API Key</label>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            className="input"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-api03-..."
          />
          <button onClick={() => setShowKey(!showKey)} className="px-4 bg-surfaceB border border-border rounded-xl text-lg hover:border-primary transition-colors">
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>
        {key
          ? <p className="text-accent text-xs mt-2">✓ API Key configurata</p>
          : <p className="text-muted text-xs mt-1">Ottieni la key su <span className="text-primary">console.anthropic.com</span></p>
        }
      </div>

      {/* USDA API Key */}
      <div className="card">
        <h2 className="font-bold text-lg mb-1">🥦 Database USDA FoodData Central</h2>
        <p className="text-sub text-sm mb-4">
          Per la ricerca con dati nutrizionali certificati USDA (5000+ alimenti reali).
          Senza key usa DEMO_KEY con limiti bassi (30 richieste/ora).
        </p>
        <label className="label">USDA API Key <span className="text-muted font-normal">(gratuita)</span></label>
        <div className="flex gap-2">
          <input
            type={showUsda ? 'text' : 'password'}
            className="input"
            value={usdaKey}
            onChange={e => setUsdaKey(e.target.value)}
            placeholder="Lascia vuoto per usare DEMO_KEY"
          />
          <button onClick={() => setShowUsda(!showUsda)} className="px-4 bg-surfaceB border border-border rounded-xl text-lg hover:border-primary transition-colors">
            {showUsda ? '🙈' : '👁️'}
          </button>
        </div>
        {usdaKey
          ? <p className="text-accent text-xs mt-2">✓ USDA Key configurata — ricerca illimitata</p>
          : <p className="text-yellow-400 text-xs mt-2">⚠️ Usando DEMO_KEY (limite 30 req/ora). Registrati su <span className="text-primary">fdc.nal.usda.gov</span> per una key gratuita.</p>
        }
      </div>

      <button onClick={save} className={`btn-primary w-full ${saved ? '!bg-accent' : ''}`}>
        {saved ? '✓ Impostazioni Salvate!' : 'Salva Impostazioni'}
      </button>

      {/* Info */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">ℹ️ Informazioni App</h2>
        <div className="space-y-3">
          {[
            ['Versione', '1.0.0'],
            ['Framework', 'Next.js 14'],
            ['AI', 'Claude (Anthropic)'],
            ['Database alimenti', 'USDA FoodData Central'],
            ['Ricerca', 'Claude + USDA API'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-sub text-sm">{k}</span>
              <span className="font-semibold text-sm">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger */}
      <div className="card border-danger/30">
        <h2 className="font-bold text-lg text-danger mb-1">⚠️ Zona Pericolosa</h2>
        <p className="text-sub text-sm mb-4">Cancella profilo, piani e impostazioni salvate.</p>
        <button onClick={clear} className="w-full border border-danger text-danger font-bold py-3 rounded-xl hover:bg-danger/10 transition-colors">
          🗑️ Cancella tutti i dati
        </button>
      </div>
    </div>
  );
}
