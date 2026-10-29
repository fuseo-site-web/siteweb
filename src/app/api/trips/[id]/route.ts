import { NextResponse } from 'next/server';
import { decryptJson } from '@/lib/crypto/health';
import { getCurrentUser } from '@/lib/auth';
import type { PlanInput } from '@/lib/plan-schema';

const uuid = /^[0-9a-f-]{36}$/;

export async function GET(_req: Request, ctx: RouteContext<'/api/trips/[id]'>) {
  const { id } = await ctx.params;
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!uuid.test(id)) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  const { data } = await supabase
    .from('trips')
    .select('inputs_enc')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    return NextResponse.json(decryptJson<PlanInput>(data.inputs_enc), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'decrypt_failed' }, { status: 500 });
  }
}
