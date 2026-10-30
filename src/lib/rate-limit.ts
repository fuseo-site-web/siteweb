import 'server-only';
import { createHash } from 'node:crypto';
import { env } from '@/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const memory = new Map<string, { count: number; reset: number }>();

/**
 * Limite le débit par empreinte (IP + navigateur) hachée. En production : fonction Postgres `rate_limit_hit`
 * (compteur atomique). Sans clé service role (développement local) : compteur en mémoire.
 */
export async function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const ip =
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local';
  const key = createHash('sha256')
    .update(`${scope}|${ip}|${req.headers.get('user-agent') ?? ''}`)
    .digest('hex');

  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await createSupabaseAdminClient().rpc('rate_limit_hit', {
      p_key_hash: key,
      p_limit: limit,
      p_window_seconds: windowSec,
    });
    if (!error) return data === true;
  }
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || cur.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSec * 1000 });
    return true;
  }
  cur.count++;
  return cur.count <= limit;
}

/**
 * Limite par clé arbitraire (ex. une adresse e-mail) plutôt que par appareil : empêche d'utiliser un formulaire
 * pour envoyer des e-mails en rafale à une même personne. La clé est hachée avant d'être stockée.
 */
export async function rateLimitKey(
  scope: string,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const hash = createHash('sha256').update(`${scope}|${key.trim().toLowerCase()}`).digest('hex');
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error } = await createSupabaseAdminClient().rpc('rate_limit_hit', {
      p_key_hash: hash,
      p_limit: limit,
      p_window_seconds: windowSec,
    });
    if (!error) return data === true;
  }
  const now = Date.now();
  const cur = memory.get(hash);
  if (!cur || cur.reset < now) {
    memory.set(hash, { count: 1, reset: now + windowSec * 1000 });
    return true;
  }
  cur.count++;
  return cur.count <= limit;
}

/** Contrôle d'Origin pour les requêtes qui modifient l'état (CSRF). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return (
      new URL(origin).host === (req.headers.get('x-forwarded-host') ?? req.headers.get('host'))
    );
  } catch {
    return false;
  }
}
