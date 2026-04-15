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
  const row = db.prepare('SELECT anthropic_key, usda_key FROM user_data WHERE user_id = ?').get(userId(session)) as { anthropic_key?: string; usda_key?: string } | undefined;
  return NextResponse.json({
    anthropicKey: row?.anthropic_key ?? '',
    usdaKey: row?.usda_key ?? '',
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  const { anthropicKey, usdaKey } = await req.json();
  db.prepare('UPDATE user_data SET anthropic_key = ?, usda_key = ?, updated_at = datetime("now") WHERE user_id = ?')
    .run(anthropicKey ?? '', usdaKey ?? '', userId(session));
  return NextResponse.json({ ok: true });
}
