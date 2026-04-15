import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

function userId(session: Awaited<ReturnType<typeof getServerSession>>) {
  return parseInt((session?.user as { id?: string })?.id ?? '0');
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const row = db.prepare('SELECT profile FROM user_data WHERE user_id = ?').get(userId(session)) as { profile?: string } | undefined;
  return NextResponse.json({ profile: row?.profile ? JSON.parse(row.profile) : null });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const { profile } = await req.json();
  const uid = userId(session);
  db.prepare(`
    INSERT INTO user_data (user_id, profile, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      profile    = excluded.profile,
      updated_at = excluded.updated_at
  `).run(uid, JSON.stringify(profile));
  return NextResponse.json({ ok: true });
}
