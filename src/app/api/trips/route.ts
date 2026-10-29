import { NextResponse } from 'next/server';
import { encryptJson, currentKeyId } from '@/lib/crypto/health';
import { getCurrentUser } from '@/lib/auth';
import { ENGINE_VERSION } from '@/engine';
import { planInputSchema } from '@/lib/plan-schema';
import { rateLimit, sameOrigin } from '@/lib/rate-limit';

/** Enregistre un voyage : données de santé chiffrées côté serveur, consentement exigé (et vérifié par la RLS). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await rateLimit(req, 'trips', 30, 60)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const text = await req.text();
  if (text.length > 16_000) return NextResponse.json({ error: 'too_large' }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = planInputSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  const input = parsed.data;

  const { data: consent } = await supabase
    .from('health_consents')
    .select('id')
    .is('withdrawn_at', null)
    .maybeSingle();
  if (!consent) return NextResponse.json({ error: 'consent_required' }, { status: 403 });

  const legs = [...input.outbound, ...input.return];
  const codes = [legs[0]!.from, ...legs.map((l) => l.to)].filter((c, i, a) => c !== a[i - 1]);
  const lastArrival = Date.parse(
    `${legs
      .map((l) => l.arrival)
      .sort()
      .at(-1)}:00Z`,
  );
  const deleteAfter = new Date(lastArrival + 365 * 864e5).toISOString();

  const { data, error } = await supabase
    .from('trips')
    .insert({
      user_id: user.id,
      route_summary: codes.join('-'),
      inputs_enc: encryptJson(input),
      key_id: currentKeyId(),
      engine_version: ENGINE_VERSION,
      delete_after: deleteAfter,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  await supabase
    .from('sleep_profiles')
    .upsert({ user_id: user.id, payload_enc: encryptJson(input.profile), key_id: currentKeyId() });

  return NextResponse.json({ id: data.id }, { headers: { 'Cache-Control': 'no-store' } });
}
