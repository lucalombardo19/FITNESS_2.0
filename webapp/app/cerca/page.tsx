'use client';
import { useState, useEffect } from 'react';
import type { NutritionResult } from '@/lib/types';
import MacroBar from '@/components/MacroBar';

const SUGGESTIONS = ['pollo petto','uova sode','avena','riso basmati','salmone','spinaci','banana','ricotta','pasta integrale','mandorle'];
const DIETARY_OPTS: Record<string, string> = { vegetarian: 'Vegetariano', vegan: 'Vegano', keto: 'Keto', low_carb: 'Low Carb', gluten_free: 'Senza Glutine' };

export default function Cerca() {
  const [q, setQ] = useState('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [results, setResults] = useState<NutritionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<NutritionResult | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => { setApiKey(localStorage.getItem('fitness_api_key') ?? ''); }, []);

  const search = async (query = q) => {
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults([]); setSelected(null); setSearched(true);
    try {
      const res = await fetch('/api/cerca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), dietary, limit: 12, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results ?? []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Ricerca fallita');
    } finally { setLoading(false); }
  };

  const toggle = (v: string) => setDietary(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Cerca Alimenti</h1>

      {/* Search box */}
      <div className="card">
        <div className="flex gap-2">
          <input
            className="input"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder='Es: "pollo petto alto proteico"...'
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button
            onClick={() => search()}
            disabled={!q.trim() || loading}
            className="btn-primary px-5 flex-shrink-0"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : '🔍'}
          </button>
        </div>

        <div className="mt-3">
          <p className="label">Filtri dietetici</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DIETARY_OPTS).map(([v, l]) => (
              <button
                key={v}
                onClick={() => toggle(v)}
                className={`chip ${dietary.includes(v) ? 'bg-primary/20 border-primary text-primary' : 'bg-surfaceB border-border text-sub hover:border-primary/50'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {!searched && (
        <div className="card">
          <h2 className="font-bold mb-3">💡 Suggerimenti</h2>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setQ(s); search(s); }}
                className="chip bg-surfaceB border-border text-sub hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div className="card border-danger/40 bg-danger/5"><p className="text-danger text-sm">⚠️ {error}</p></div>}

      {/* Selected food detail */}
      {selected && (
        <div className="card border-accent/40 bg-accent/5">
          <div className="flex justify-between items-start mb-2">
            <h2 className="font-extrabold text-lg">{selected.name}</h2>
            <button onClick={() => setSelected(null)} className="text-muted text-xl">✕</button>
          </div>
          {selected.brand && <p className="text-sub text-sm mb-3">{selected.brand}</p>}
          <div className="flex items-end gap-1 mb-4">
            <span className="text-4xl font-extrabold text-accent">{Math.round(selected.calories_per_100g)}</span>
            <span className="text-sub mb-1">kcal / 100g</span>
          </div>
          <MacroBar label="Proteine"    value={selected.protein_g} max={50}  color="#6C63FF" />
          <MacroBar label="Carboidrati" value={selected.carbs_g}   max={100} color="#43D9AD" />
          <MacroBar label="Grassi"      value={selected.fat_g}     max={50}  color="#FF6584" />
          {selected.fiber_g != null && <MacroBar label="Fibre" value={selected.fiber_g} max={20} color="#FFB347" />}
          {selected.similarity_score != null && (
            <p className="text-accent text-xs text-right mt-2">Rilevanza: {(selected.similarity_score * 100).toFixed(0)}%</p>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          <p className="text-sub text-sm">{results.length} risultati trovati</p>
          <div className="space-y-2">
            {results.map((item, i) => (
              <button
                key={i}
                onClick={() => setSelected(item)}
                className={`w-full card text-left hover:border-primary transition-all ${selected?.name === item.name ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    {item.brand && <p className="text-muted text-xs">{item.brand}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold">{Math.round(item.calories_per_100g)} kcal</p>
                    <p className="text-muted text-xs">/ 100g</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-sub">
                  <span>P: {item.protein_g.toFixed(1)}g</span>
                  <span>C: {item.carbs_g.toFixed(1)}g</span>
                  <span>F: {item.fat_g.toFixed(1)}g</span>
                  {item.similarity_score != null && (
                    <span className="text-accent ml-auto">{(item.similarity_score * 100).toFixed(0)}% match</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {searched && !loading && results.length === 0 && !error && (
        <div className="card text-center py-8">
          <p className="text-sub">Nessun risultato per &ldquo;{q}&rdquo;</p>
          <p className="text-muted text-sm mt-1">Prova con termini diversi</p>
        </div>
      )}
    </div>
  );
}
