import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/env';

/** Paiement en ligne actif ? (clés Stripe configurées sur le serveur) */
export const billingEnabled = () => !!env.STRIPE_SECRET_KEY && !!env.STRIPE_WEBHOOK_SECRET;

/** Appel à l'API Stripe (formulaire encodé), sans dépendance supplémentaire. */
export async function stripeApi<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquante');
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  const json = (await r.json()) as T & { error?: { message?: string } };
  if (!r.ok) throw new Error(json.error?.message ?? `Stripe ${r.status}`);
  return json;
}

/**
 * Vérifie la signature d'un webhook Stripe (en-tête Stripe-Signature : t=…,v1=…) :
 * HMAC-SHA256 de « t.corps » avec le secret du webhook, et horodatage de moins de 5 minutes.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  now = Date.now(),
  toleranceS = 300,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i), p.slice(i + 1)];
    }),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > toleranceS) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  const signatures = header
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3));
  return signatures.some(
    (sig) =>
      sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)),
  );
}
