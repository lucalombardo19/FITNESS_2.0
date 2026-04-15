'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Le password non corrispondono'); return; }
    setLoading(true); setError('');
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    await signIn('credentials', { username, password, redirect: false });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-primary">💪</h1>
          <h2 className="text-2xl font-extrabold mt-2">Crea account</h2>
          <p className="text-sub mt-1">Inizia il tuo percorso fitness</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="scegli_username" autoComplete="username" required minLength={3} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="minimo 6 caratteri" autoComplete="new-password" required minLength={6} />
          </div>
          <div>
            <label className="label">Conferma Password</label>
            <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="ripeti la password" autoComplete="new-password" required />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Registrazione...' : 'Registrati'}
          </button>
        </form>

        <p className="text-center text-sub text-sm mt-4">
          Hai già un account?{' '}
          <Link href="/login" className="text-primary font-semibold">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
