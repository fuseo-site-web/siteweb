'use server';

import { z } from 'zod';
import { DELETION_REASONS } from '@/lib/account/deletion';
import { ADMIN_EMAIL } from '@/lib/admin/access';
import { getCurrentUser, HEALTH_POLICY_VERSION } from '@/lib/auth';
import { buildDeletionAck, buildDeletionAdmin } from '@/lib/email/deletion';
import type { Lang } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
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
/**
 * Demande de suppression de compte : le motif et un commentaire facultatif sont transmis à l'équipe, qui supprime
 * le compte depuis l'espace admin (au plus tard sous un mois, RGPD). Le client et l'équipe reçoivent un e-mail.
 */
export async function requestAccountDeletion(input: unknown): Promise<Result> {
  const { user } = await getCurrentUser();
  if (!user?.email) return { ok: false };
  const parsed = z
    .object({
      reason: z.enum(DELETION_REASONS),
      comment: z.string().trim().max(1000).optional(),
      locale: z.enum(['fr', 'en', 'es']).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false };
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('user_profiles')
    .select('first_name, last_name, preferred_locale')
    .eq('user_id', user.id)
    .maybeSingle();
  const lang = (profile?.preferred_locale ?? parsed.data.locale ?? 'fr') as Lang;
  const { error } = await admin.from('account_deletion_requests').insert({
    user_id: user.id,
    email: user.email,
    reason: parsed.data.reason,
    comment: parsed.data.comment || null,
    locale: lang,
  });
  // Une demande déjà en cours (index unique) : on ne renvoie pas les e-mails.
  if (error) return { ok: error.code === '23505' };
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;
  const ack = buildDeletionAck(lang, user.email);
  const notif = buildDeletionAdmin({
    email: user.email,
    name,
    reason: parsed.data.reason,
    comment: parsed.data.comment,
  });
  await Promise.allSettled([
    sendEmail({ to: user.email, subject: ack.subject, html: ack.html, text: ack.text }),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: notif.subject,
      html: notif.html,
      text: notif.text,
      replyTo: user.email,
    }),
  ]);
  return { ok: true };
}

/** Le client annule sa demande tant qu'elle n'a pas été traitée. */
export async function cancelAccountDeletion(): Promise<Result> {
  const { user } = await getCurrentUser();
  if (!user) return { ok: false };
  const { error } = await createSupabaseAdminClient()
    .from('account_deletion_requests')
    .update({ status: 'cancelled', processed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'pending');
  return { ok: !error };
}

export async function signOutAction(): Promise<Result> {
  const { supabase } = await getCurrentUser();
  await supabase.auth.signOut();
  return { ok: true };
}

/** Informations personnelles (identité) : validées côté serveur, propriétaire seul (RLS). */
export async function saveProfile(
  raw: unknown,
  options: { complete?: boolean } = {},
): Promise<Result & { invalid?: boolean }> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return { ok: false };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, invalid: true };
  const v = parsed.data;
  // Première connexion : les cinq informations sont obligatoires.
  if (
    options.complete &&
    !(v.firstName && v.lastName && v.birthDate && v.country && v.homeAirport)
  ) {
    return { ok: false, invalid: true };
  }
  const row = {
    first_name: v.firstName,
    last_name: v.lastName,
    birth_date: v.birthDate,
    country: v.country,
    home_airport: v.homeAirport,
    preferred_locale: v.preferredLocale,
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
