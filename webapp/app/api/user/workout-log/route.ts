import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import type { ExerciseSetLog } from '@/lib/types';

type WorkoutRow = { id: number; date: string; exercise_name: string; session_focus: string; sets_json: string; notes: string | null };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const uid = parseInt((session.user as { id?: string }).id ?? '0');
  const rows = db.prepare(`
    SELECT id, date, exercise_name, session_focus, sets_json, notes
    FROM workout_log WHERE user_id = ?
    ORDER BY date DESC, id DESC LIMIT 100
  `).all(uid) as WorkoutRow[];

  const logs = rows.map(r => ({
    id: r.id,
    date: r.date,
    exercise_name: r.exercise_name,
    session_focus: r.session_focus,
    sets: JSON.parse(r.sets_json) as ExerciseSetLog[],
    notes: r.notes,
  }));

  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const uid = parseInt((session.user as { id?: string }).id ?? '0');
  const { date, exercise_name, session_focus, sets, notes } = await req.json() as {
    date: string; exercise_name: string; session_focus: string;
    sets: ExerciseSetLog[]; notes?: string;
  };

  if (!exercise_name?.trim() || !sets?.length) {
    return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
  }

  db.prepare(`
    INSERT INTO workout_log (user_id, date, exercise_name, session_focus, sets_json, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uid, date || new Date().toISOString().slice(0, 10), exercise_name.trim(), session_focus ?? '', JSON.stringify(sets), notes ?? null);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const uid = parseInt((session.user as { id?: string }).id ?? '0');
  const { id } = await req.json() as { id: number };
  db.prepare('DELETE FROM workout_log WHERE id = ? AND user_id = ?').run(id, uid);
  return NextResponse.json({ ok: true });
}
