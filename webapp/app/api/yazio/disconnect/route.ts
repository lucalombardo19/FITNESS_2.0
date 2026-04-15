import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

  const uid = parseInt((session.user as { id?: string }).id ?? '0');
  db.prepare(`UPDATE user_data SET yazio_access_token = NULL, yazio_refresh_token = NULL, yazio_token_expires = NULL WHERE user_id = ?`).run(uid);

  return NextResponse.json({ ok: true });
}
