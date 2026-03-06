import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getDatabase } = await import('@/lib/storage/db');
    const db = getDatabase();
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    if (row?.ok !== 1) throw new Error('DB check failed');

    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 503 },
    );
  }
}
