import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { yazioRefresh, yazioGetDiary } from '@/lib/yazio';

type UserRow = { yazio_access_token?: string; yazio_refresh_token?: string; yazio_token_expires?: string };

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const uid = parseInt((session.user as { id?: string }).id ?? '0');
    let row = db.prepare('SELECT yazio_access_token, yazio_refresh_token, yazio_token_expires FROM user_data WHERE user_id = ?').get(uid) as UserRow | undefined;

    if (!row?.yazio_access_token) {
      return NextResponse.json({ connected: false, meals: [] });
    }

    // Refresh token if expires within 1 hour
    let token = row.yazio_access_token;
    if (row.yazio_token_expires) {
      const expiresAt = new Date(row.yazio_token_expires).getTime();
      if (Date.now() > expiresAt - 3600_000 && row.yazio_refresh_token) {
        const refreshed = await yazioRefresh(row.yazio_refresh_token);
        db.prepare(`UPDATE user_data SET yazio_access_token = ?, yazio_refresh_token = ?, yazio_token_expires = ? WHERE user_id = ?`)
          .run(refreshed.access_token, refreshed.refresh_token, refreshed.expires_at, uid);
        token = refreshed.access_token;
      }
    }

    const data = await yazioGetDiary(token);
    return NextResponse.json({ connected: true, meals: data.meals ?? [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as { message?: string })?.message }, { status: 500 });
  }
}
