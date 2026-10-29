import { NextResponse } from 'next/server';
import { decryptJson } from '@/lib/crypto/health';
import { getCurrentUser } from '@/lib/auth';
import type { PlanInput } from '@/lib/plan-schema';

/** Profil de sommeil enregistré, pour pré-remplir le formulaire sur un autre appareil. */
export async function GET() {
  const { supabase, user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data } = await supabase.from('sleep_profiles').select('payload_enc').maybeSingle();
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    return NextResponse.json(decryptJson<PlanInput['profile']>(data.payload_enc), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'decrypt_failed' }, { status: 500 });
  }
}
