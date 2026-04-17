import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Username e password obbligatori' }, { status: 400 });
    }
    if (username.length < 3) return NextResponse.json({ error: 'Username minimo 3 caratteri' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password minimo 6 caratteri' }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username.trim(), hash);
    db.prepare('INSERT INTO user_data (user_id) VALUES (?)').run(result.lastInsertRowid);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Username già in uso' }, { status: 409 });
    }
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
