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
  const row = db.prepare('SELECT last_plan FROM user_data WHERE user_id = ?').get(userId(session)) as { last_plan?: string } | undefined;
  return NextResponse.json({ plan: row?.last_plan ? JSON.parse(row.last_plan) : null });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const { plan } = await req.json();
  db.prepare('UPDATE user_data SET last_plan = ?, updated_at = datetime("now") WHERE user_id = ?').run(JSON.stringify(plan), userId(session));
  return NextResponse.json({ ok: true });
}
