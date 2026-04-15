'use client';
import { useState, useEffect } from 'react';

export default function Impostazioni() {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem('fitness_api_key') ?? '';
    setKey(k);
  }, []);

  const save = () => {
    localStorage.setItem('fitness_api_key', key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clear = () => {
    if (confirm('Cancellare tutti i dati salvati?')) {
      localStorage.clear();
      setKey('');
      alert('Dati cancellati.');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Impostazioni</h1>

      {/* API Key */}
      <div className="card">
        <h2 className="font-bold text-lg mb-1">🤖 Claude AI</h2>
        <p className="text-sub text-sm mb-4">Inserisci la tua Anthropic API Key per generare piani</p>
        <label className="label">API Key</label>
        <div className="flex gap-2">
          <input
            type={show ? 'text' : 'password'}
            className="input"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-api03-..."
          />
          <button
            onClick={() => setShow(!show)}
            className="px-4 bg-surfaceB border border-border rounded-xl text-lg hover:border-primary transition-colors"
          >
            {show ? '🙈' : '👁️'}
          </button>
        </div>
        {key && <p className="text-accent text-xs mt-2">✓ API Key configurata</p>}
        <p className="text-muted text-xs mt-1">
          Ottieni la tua key su{' '}
          <span className="text-primary">console.anthropic.com</span>
        </p>
        <button
          onClick={save}
          className={`btn-primary w-full mt-4 ${saved ? '!bg-accent' : ''}`}
        >
          {saved ? '✓ Salvata!' : 'Salva API Key'}
        </button>
      </div>

      {/* Info */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4">ℹ️ Informazioni App</h2>
        <div className="space-y-3">
          {[
            ['Versione', '1.0.0'],
            ['Framework', 'Next.js 14'],
            ['AI', 'Claude (Anthropic)'],
            ['Storage', 'Browser localStorage'],
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
        <p className="text-sub text-sm mb-4">Questa azione cancellerà profilo, piani e impostazioni salvate.</p>
        <button onClick={clear} className="w-full border border-danger text-danger font-bold py-3 rounded-xl hover:bg-danger/10 transition-colors">
          🗑️ Cancella tutti i dati
        </button>
      </div>
    </div>
  );
}
