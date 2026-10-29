import { NextResponse } from 'next/server';
import { decryptJson } from '@/lib/crypto/health';
import { getCurrentUser } from '@/lib/auth';

/** Portabilité (art. 20 RGPD) : export des données de l'utilisateur, déchiffrées pour lui seul. */
export async function GET() {
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [profile, trips, consents, entitlements, identity] = await Promise.all([
    supabase.from('sleep_profiles').select('payload_enc, updated_at').maybeSingle(),
    supabase
      .from('trips')
      .select('id, route_summary, inputs_enc, created_at, engine_version, delete_after'),
    supabase.from('health_consents').select('purpose, policy_version, granted_at, withdrawn_at'),
    supabase
      .from('entitlements')
      .select('offer, status, amount_cents, currency, starts_at, expires_at, created_at'),
    supabase
      .from('user_profiles')
      .select('first_name, last_name, birth_date, country, home_airport')
      .maybeSingle(),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, ...identity.data },
    sleepProfile: profile.data
      ? { ...decryptJson<object>(profile.data.payload_enc), updatedAt: profile.data.updated_at }
      : null,
    trips: (trips.data ?? []).map(({ inputs_enc, ...t }) => ({
      ...t,
      inputs: decryptJson<object>(inputs_enc),
    })),
    healthConsents: consents.data ?? [],
    entitlements: entitlements.data ?? [],
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="fuseo-mes-donnees.json"',
      'Cache-Control': 'no-store',
    },
  });
}
