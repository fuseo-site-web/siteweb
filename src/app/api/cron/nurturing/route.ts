import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { env } from '@/env';
import { runNurturing } from '@/lib/nurturing/run';

/** Tâche planifiée (toutes les heures, fonction Netlify) : envoie les e-mails de nurturing dus. */
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const secret = env.CRON_SECRET;
  if (
    !secret ||
    token.length !== secret.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  )
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const dryRun = new URL(req.url).searchParams.get('dry') === '1';
  try {
    return NextResponse.json(await runNurturing(Date.now(), { dryRun }));
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
