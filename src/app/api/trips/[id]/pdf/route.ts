import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { decryptJson } from '@/lib/crypto/health';
import { planPdfResponse } from '@/lib/pdf/respond';
import type { PlanInput } from '@/lib/plan-schema';
import { rateLimit } from '@/lib/rate-limit';

const uuid = /^[0-9a-f-]{36}$/;

/** PDF d'un voyage enregistré : déchiffré côté serveur pour son propriétaire uniquement. */
export async function GET(req: Request, ctx: RouteContext<'/api/trips/[id]/pdf'>) {
  const { id } = await ctx.params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!uuid.test(id)) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  if (!(await rateLimit(req, 'trip-pdf', 20, 60)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { data } = await supabase
    .from('trips')
    .select('inputs_enc')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    return await planPdfResponse(
      decryptJson<PlanInput>(data.inputs_enc),
      new URL(req.url).searchParams.get('locale'),
    );
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
