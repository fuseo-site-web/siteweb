import 'server-only';
import { env } from '@/env';
import { decryptJson } from '@/lib/crypto/health';
import { articlesFor } from '@/lib/email/articles';
import type { Lang } from '@/lib/email/layout';
import { buildNurturing, type SequenceId } from '@/lib/email/nurturing';
import { sendEmail } from '@/lib/email/send';
import { unsubscribeUrl } from '@/lib/email/unsubscribe';
import type { PlanInput } from '@/lib/plan-schema';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Activation du nurturing automatique : seuls les comptes et voyages postérieurs sont concernés. */
export const NURTURING_START = Date.parse('2026-11-03T00:00:00Z');
const H = 3_600_000;
const D = 24 * H;
/** Au plus N e-mails par passage (la tâche tourne toutes les heures). */
const MAX_PER_RUN = 80;

interface Job {
  userId: string;
  email: string;
  sequence: SequenceId;
  tripId: string | null;
  lang: Lang;
  firstName?: string;
}

const asLang = (v: unknown): Lang => (v === 'en' || v === 'es' ? v : 'fr');

/** Première heure de départ et dernière heure d'arrivée d'un voyage (heures locales lues comme UTC : ± quelques heures). */
function tripTimes(input: PlanInput) {
  const legs = [...input.outbound, ...input.return];
  const dep = Math.min(...legs.map((l) => Date.parse(`${l.departure}:00Z`)));
  const arr = Math.max(...legs.map((l) => Date.parse(`${l.arrival}:00Z`)));
  return { dep, arr };
}

/**
 * Calcule et envoie les e-mails de nurturing dus :
 * - Bienvenue : compte créé depuis l'activation, profil rempli ;
 * - Premier plan : 3 à 14 jours après l'inscription, aucun voyage enregistré, pas désinscrit (e-mail commercial) ;
 * - Voyage qui approche : départ dans 2 à 3 jours ;
 * - Après le voyage : arrivée il y a 2 à 3 jours.
 * Chaque envoi est tracé : jamais deux fois la même séquence pour un même compte (ou voyage).
 */
export async function runNurturing(now = Date.now(), { dryRun = false } = {}) {
  const db = createSupabaseAdminClient();
  const users = (await db.auth.admin.listUsers({ page: 1, perPage: 1000 })).data?.users ?? [];
  const [profiles, sends, trips, unsubscribed] = await Promise.all([
    db.from('user_profiles').select('user_id, first_name, preferred_locale'),
    db.from('nurturing_sends').select('user_id, sequence, trip_id'),
    db.from('trips').select('id, user_id, inputs_enc'),
    db.from('newsletter_subscribers').select('email').eq('status', 'unsubscribed'),
  ]);
  const prof = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
  const sent = new Set(
    (sends.data ?? []).map((s) => `${s.user_id}|${s.sequence}|${s.trip_id ?? ''}`),
  );
  const optOut = new Set((unsubscribed.data ?? []).map((u) => u.email.toLowerCase()));
  const tripsByUser = new Map<string, Array<{ id: string; dep: number; arr: number }>>();
  for (const t of trips.data ?? []) {
    try {
      const times = tripTimes(decryptJson<PlanInput>(t.inputs_enc));
      tripsByUser.set(t.user_id, [...(tripsByUser.get(t.user_id) ?? []), { id: t.id, ...times }]);
    } catch {
      /* voyage illisible (clé tournée) : ignoré */
    }
  }

  const jobs: Job[] = [];
  for (const u of users) {
    if (!u.email || !u.email_confirmed_at) continue;
    const p = prof.get(u.id);
    const base = {
      userId: u.id,
      email: u.email,
      lang: asLang(p?.preferred_locale ?? u.user_metadata?.locale),
      firstName: p?.first_name ?? undefined,
    };
    const has = (seq: SequenceId, tripId: string | null = null) =>
      sent.has(`${u.id}|${seq}|${tripId ?? ''}`);
    const created = Date.parse(u.created_at);
    const userTrips = tripsByUser.get(u.id) ?? [];

    if (created >= NURTURING_START && p?.first_name && !has('welcome'))
      jobs.push({ ...base, sequence: 'welcome', tripId: null });
    if (
      created >= NURTURING_START &&
      now - created >= 3 * D &&
      now - created <= 14 * D &&
      !userTrips.length &&
      !optOut.has(u.email.toLowerCase()) &&
      !has('first-plan')
    )
      jobs.push({ ...base, sequence: 'first-plan', tripId: null });
    for (const t of userTrips) {
      if (t.dep - now >= 2 * D && t.dep - now <= 3 * D && !has('pre-trip', t.id))
        jobs.push({ ...base, sequence: 'pre-trip', tripId: t.id });
      if (
        t.arr >= NURTURING_START &&
        now - t.arr >= 2 * D &&
        now - t.arr <= 3 * D &&
        !has('post-trip', t.id)
      )
        jobs.push({ ...base, sequence: 'post-trip', tripId: t.id });
    }
  }

  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const result = { due: jobs.length, sent: 0, failed: 0, bySequence: {} as Record<string, number> };
  if (dryRun) {
    for (const j of jobs) result.bySequence[j.sequence] = (result.bySequence[j.sequence] ?? 0) + 1;
    return result;
  }
  for (const j of jobs.slice(0, MAX_PER_RUN)) {
    const unsub = env.ADMIN_SESSION_SECRET
      ? unsubscribeUrl(site, j.email, env.ADMIN_SESSION_SECRET, j.lang)
      : undefined;
    const mail = buildNurturing(j.sequence, j.lang, {
      firstName: j.firstName,
      email: j.email,
      articles: await articlesFor(j.sequence, j.lang),
      unsubscribeUrl: unsub,
    });
    // E-mail commercial sans lien de désinscription : on n'envoie pas.
    if (mail.kind === 'marketing' && !unsub) continue;
    const r = await sendEmail({
      to: j.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      unsubscribeUrl: mail.kind === 'marketing' ? unsub : undefined,
    });
    if (!r.ok) {
      result.failed++;
      continue;
    }
    await db
      .from('nurturing_sends')
      .insert({ user_id: j.userId, sequence: j.sequence, trip_id: j.tripId, email_id: r.id });
    result.sent++;
    result.bySequence[j.sequence] = (result.bySequence[j.sequence] ?? 0) + 1;
  }
  return result;
}
