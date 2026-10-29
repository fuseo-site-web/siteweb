'use server';

import { getCurrentUser, HEALTH_POLICY_VERSION } from '@/lib/auth';
import { profileSchema } from '@/lib/profile-schema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

type Result = { ok: boolean };

/** Consentement explicite et séparé au traitement des données de santé (art. 9.2.a RGPD). */
export async function grantHealthConsent(): Promise<Result> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from('health_consents')
    .insert({ user_id: user.id, policy_version: HEALTH_POLICY_VERSION, purpose: 'health_data' });
  // 23505 : consentement déjà actif (index unique partiel) → rien à faire.
  return { ok: !error || error.code === '23505' };
}

/** Le retrait supprime les données de santé : profil, questionnaire et voyages. */
export async function withdrawHealthConsent(): Promise<Result> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const del = await Promise.all([
    supabase.from('trips').delete().eq('user_id', user.id),
    supabase.from('sleep_profiles').delete().eq('user_id', user.id),
    supabase.from('medical_screenings').delete().eq('user_id', user.id),
  ]);
  if (del.some((r) => r.error)) return { ok: false };
  const { error } = await supabase
    .from('health_consents')
    .update({ withdrawn_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('withdrawn_at', null);
  return { ok: !error };
}

export async function deleteTrip(id: string): Promise<Result> {
  const { supabase, user } = await getCurrentUser();
  if (!user || !/^[0-9a-f-]{36}$/.test(id)) return { ok: false };
  const { error } = await supabase.from('trips').delete().eq('id', id).eq('user_id', user.id);
  return { ok: !error };
}

/** Suppression du compte : cascade sur les données de santé ; les accès payés sont conservés sans lien d'identité sanitaire. */
export async function deleteAccount(): Promise<Result> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const admin = createSupabaseAdminClient();
  await admin.from('audit_log').insert({ actor: null, action: 'account_deleted', target: user.id });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false };
  await supabase.auth.signOut();
  return { ok: true };
}

export async function signOutAction(): Promise<Result> {
  const { supabase } = await getCurrentUser();
  await supabase.auth.signOut();
  return { ok: true };
}

/** Informations personnelles (identité) : validées côté serveur, propriétaire seul (RLS). */
export async function saveProfile(raw: unknown): Promise<Result & { invalid?: boolean }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, invalid: true };
  const v = parsed.data;
  const row = {
    first_name: v.firstName,
    last_name: v.lastName,
    birth_date: v.birthDate,
    country: v.country,
    home_airport: v.homeAirport,
  };
  const updated = await supabase
    .from('user_profiles')
    .update(row)
    .eq('user_id', user.id)
    .select('user_id');
  if (updated.error) return { ok: false };
  if (updated.data.length) return { ok: true };
  const { error } = await supabase.from('user_profiles').insert({ user_id: user.id, ...row });
  return { ok: !error };
}
