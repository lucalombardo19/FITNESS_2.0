import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

type WeightRow = { id: number; weight_kg: number; date: string; notes: string | null; created_at: string };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const uid = parseInt((session.user as { id?: string }).id ?? '0');
  const entries = db.prepare(
    'SELECT id, weight_kg, date, notes, created_at FROM weight_log WHERE user_id = ? ORDER BY date DESC LIMIT 90'
  ).all(uid) as WeightRow[];

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const uid = parseInt((session.user as { id?: string }).id ?? '0');
  const { weight_kg, date, notes } = await req.json() as { weight_kg: number; date: string; notes?: string };

  if (!weight_kg || weight_kg < 20 || weight_kg > 500) {
    return NextResponse.json({ error: 'Peso non valido' }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Data non valida' }, { status: 400 });
  }

  // Upsert: one entry per day per user
  db.prepare(`
    INSERT INTO weight_log (user_id, weight_kg, date, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `).run(uid, weight_kg, date, notes ?? null);

  // If already existed for that date, update it
  db.prepare(`
    UPDATE weight_log SET weight_kg = ?, notes = ? WHERE user_id = ? AND date = ?
  `).run(weight_kg, notes ?? null, uid, date);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const uid = parseInt((session.user as { id?: string }).id ?? '0');
  const { id } = await req.json() as { id: number };

  db.prepare('DELETE FROM weight_log WHERE id = ? AND user_id = ?').run(id, uid);
  return NextResponse.json({ ok: true });
}
