import { createHmac, timingSafeEqual } from 'node:crypto';

/** Lien de désinscription : l'adresse et une signature (HMAC) ; aucune base de données à interroger pour le vérifier. */
const sign = (email: string, secret: string) =>
  createHmac('sha256', secret)
    .update(`unsubscribe:${email.trim().toLowerCase()}`)
    .digest('base64url')
    .slice(0, 32);

export function unsubscribeUrl(site: string, email: string, secret: string, lang = 'fr') {
  const q = new URLSearchParams({ e: email.trim().toLowerCase(), t: sign(email, secret), l: lang });
  return `${site}/api/unsubscribe?${q.toString()}`;
}

export function verifyUnsubscribe(
  email: string | null,
  token: string | null,
  secret: string,
): boolean {
  if (!email || !token) return false;
  const a = Buffer.from(sign(email, secret));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
