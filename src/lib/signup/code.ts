import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '@/env';
import { CODE_TTL_MIN, buildSignupCode, buildSignupExists } from '@/lib/email/verification';
import { sendEmail } from '@/lib/email/send';
import type { Lang } from '@/lib/email/layout';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const CODE_LENGTH = 8;
/** Délai minimal entre deux envois pour un même compte (secondes). */
export const RESEND_COOLDOWN_SEC = 60;

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** 8 chiffres tirés avec un générateur cryptographique (zéros initiaux conservés). */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

/** Hachage à clé : une fuite de la table ne permet pas de retrouver les codes sans la clé serveur. */
export function hashCode(userId: string, code: string): string {
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createHmac('sha256', key).update(`${userId}:${code}`).digest('hex');
}

export function codeMatches(userId: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(userId, code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Compte retrouvé par adresse : identifiant et adresse déjà confirmée ou non. */
export async function findUserByEmail(db: Admin, email: string) {
  const { data } = await db.rpc('auth_user_by_email', { p_email: email });
  const row = data?.[0];
  return row ? { id: row.id, confirmed: row.confirmed } : null;
}

/**
 * Crée un nouveau code pour le compte et l'envoie par e-mail (Resend, expéditeur Fuseo).
 * Un envoi déjà fait il y a moins de RESEND_COOLDOWN_SEC secondes n'est pas renouvelé.
 */
export async function issueSignupCode(
  db: Admin,
  user: { id: string; email: string },
  lang: Lang,
): Promise<{ ok: true } | { ok: false }> {
  const { data: current } = await db
    .from('signup_verifications')
    .select('sent_at, expires_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (
    current &&
    new Date(current.expires_at).getTime() > Date.now() &&
    Date.now() - new Date(current.sent_at).getTime() < RESEND_COOLDOWN_SEC * 1000
  ) {
    return { ok: true };
  }

  const code = generateCode();
  const { error } = await db.from('signup_verifications').upsert({
    user_id: user.id,
    code_hash: hashCode(user.id, code),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    attempts: 0,
    sent_at: new Date().toISOString(),
  });
  if (error) return { ok: false };

  const mail = buildSignupCode(lang, user.email, code);
  const sent = await sendEmail({ to: user.email, ...mail });
  return sent.ok ? { ok: true } : { ok: false };
}

/** Adresse déjà confirmée : on prévient la personne par e-mail plutôt que de le révéler à l'écran. */
export async function sendAlreadyRegistered(email: string, lang: Lang) {
  const mail = buildSignupExists(lang, email);
  await sendEmail({ to: email, ...mail });
}
