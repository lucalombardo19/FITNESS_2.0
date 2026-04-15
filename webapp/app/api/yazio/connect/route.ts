import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { yazioLogin } from '@/lib/yazio';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const uid = parseInt((session.user as { id?: string }).id ?? '0');
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username e password Yazio obbligatori' }, { status: 400 });
    }

    const tokens = await yazioLogin(username, password);

    db.prepare(`
      UPDATE user_data
      SET yazio_access_token = ?, yazio_refresh_token = ?, yazio_token_expires = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(tokens.access_token, tokens.refresh_token, tokens.expires_at, uid);

    return NextResponse.json({ ok: true, expires_at: tokens.expires_at });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as { message?: string })?.message }, { status: 400 });
  }
}
