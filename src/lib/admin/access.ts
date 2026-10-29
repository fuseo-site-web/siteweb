import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { env } from '@/env';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Seul compte autorisé à ouvrir l'espace administrateur. */
export const ADMIN_EMAIL = 'contact.fuseo@gmail.com';
export const ADMIN_COOKIE = 'fuseo_admin';
const SESSION_HOURS = 2;

const sha = (s: string) => createHash('sha256').update(s).digest();
const safeEqual = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

/** Le code saisi est-il le bon ? Comparaison à temps constant ; faux si le code n'est pas configuré. */
export function checkAdminCode(input: string): boolean {
  if (!env.ADMIN_ACCESS_CODE) return false;
  return safeEqual(
    sha(input.trim().toLowerCase()),
    sha(env.ADMIN_ACCESS_CODE.trim().toLowerCase()),
  );
}

/** Jeton de session signé (identifiant du compte + expiration), à placer dans un cookie httpOnly. */
export function signAdminSession(
  userId: string,
  now = Date.now(),
  secret = env.ADMIN_SESSION_SECRET,
): string {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET manquant');
  const payload = Buffer.from(
    JSON.stringify({ u: userId, e: now + SESSION_HOURS * 3_600_000 }),
  ).toString('base64url');
  const mac = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

export function verifyAdminSession(
  token: string | undefined,
  userId: string,
  now = Date.now(),
  secret = env.ADMIN_SESSION_SECRET,
): boolean {
  if (!token || !secret) return false;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(Buffer.from(mac), Buffer.from(expected))) return false;
  try {
    const { u, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      u: string;
      e: number;
    };
    return u === userId && typeof e === 'number' && e > now;
  } catch {
    return false;
  }
}

/** Ce compte est-il l'administrateur ? (sans appel réseau : pour décider d'afficher le bouton d'accès) */
export function isAdminAccount(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
}): boolean {
  return (
    !!env.ADMIN_ACCESS_CODE &&
    !!env.ADMIN_SESSION_SECRET &&
    !!user.email_confirmed_at &&
    user.email?.toLowerCase() === ADMIN_EMAIL
  );
}

/** Compte administrateur : bonne adresse e-mail, confirmée. Retourne null sinon (l'espace n'existe pas pour les autres). */
export async function getAdminUser() {
  if (!env.ADMIN_ACCESS_CODE || !env.ADMIN_SESSION_SECRET) return null;
  const { user } = await getCurrentUser();
  if (!user || !user.email_confirmed_at) return null;
  return user.email?.toLowerCase() === ADMIN_EMAIL ? user : null;
}

/** Accès complet : compte administrateur ET code saisi (session valide). À appeler dans chaque action et route. */
export async function getAdminSession() {
  const user = await getAdminUser();
  if (!user) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminSession(token, user.id) ? user : null;
}

export async function requireAdmin() {
  const user = await getAdminSession();
  if (!user) throw new Error('forbidden');
  return { user, db: createSupabaseAdminClient() };
}

export const SESSION_MAX_AGE = SESSION_HOURS * 3600;

/** Journal des actions de l'espace administrateur (qui, quoi, sur quoi). */
export async function logAdmin(
  userId: string | null,
  action: string,
  target?: string,
  meta?: Record<string, string | number | boolean | null>,
) {
  try {
    await createSupabaseAdminClient()
      .from('audit_log')
      .insert({ actor: userId, action, target: target ?? null, meta: meta ?? null });
  } catch {
    /* le journal ne doit jamais bloquer l'action */
  }
}

/** Limite les essais de code : 5 tentatives par 15 minutes et par appareil. */
export async function codeAttemptAllowed(): Promise<boolean> {
  const h = await headers();
  return rateLimit(new Request('http://admin.local', { headers: h }), 'admin-code', 5, 900);
}
