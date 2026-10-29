import { NextResponse } from 'next/server';
import { readPlanRequest } from '@/lib/plan-request';
import { runPlan } from '@/lib/plan-view';

export async function POST(req: Request) {
  const request = await readPlanRequest(req, 'plan');
  if ('error' in request) return request.error;

  const locale = new URL(req.url).searchParams.get('locale') ?? 'fr';
  try {
    const plan = runPlan(request.input, locale);
    if (!plan.ok) return NextResponse.json({ error: 'engine', codes: plan.codes }, { status: 422 });
    // Seuls les jours gratuits sont envoyés : le reste du plan ne quitte jamais le serveur.
    return NextResponse.json(plan, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
