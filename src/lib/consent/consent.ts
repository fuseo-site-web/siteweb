// Consentement aux traceurs : un cookie `fuseo_consent` (version de la politique, choix, date).
// Rien n'est déposé ni chargé avant un choix ; le choix est redemandé au bout de 6 mois.

export const CONSENT_COOKIE = 'fuseo_consent';
export const CONSENT_VERSION = '2026-10';
export const CONSENT_TTL_DAYS = 180;

export type Consent = { v: string; analytics: boolean; ts: number; id: string };

const DAY_MS = 86_400_000;

/** `id` : identifiant aléatoire du navigateur, conservé d'un choix à l'autre (preuve du consentement). */
export function makeConsent(analytics: boolean, id: string, now = Date.now()): Consent {
  return { v: CONSENT_VERSION, analytics, ts: now, id };
}

export function serializeConsent(consent: Consent, secure: boolean): string {
  const value = encodeURIComponent(JSON.stringify(consent));
  const flags = secure ? '; Secure' : '';
  return `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_TTL_DAYS * 86_400}; SameSite=Lax${flags}`;
}

/** Choix valide (bonne version, moins de 6 mois) ou null : dans ce cas, on redemande. */
export function parseConsent(raw: string | null | undefined, at?: number): Consent | null {
  // Pas d'horloge au rendu serveur (sans cookie, on sort avant).
  if (!raw) return null;
  const now = at ?? Date.now();
  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof data !== 'object' || data === null) return null;
    const { v, analytics, ts, id } = data as Record<string, unknown>;
    if (
      v !== CONSENT_VERSION ||
      typeof analytics !== 'boolean' ||
      typeof ts !== 'number' ||
      typeof id !== 'string'
    ) {
      return null;
    }
    if (now - ts > CONSENT_TTL_DAYS * DAY_MS || ts > now + DAY_MS) return null;
    return { v, analytics, ts, id };
  } catch {
    return null;
  }
}

export function readCookie(cookieString: string, name: string): string | null {
  for (const part of cookieString.split('; ')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

/** Pages où Microsoft Clarity ne doit jamais s'exécuter (données de santé, compte, connexion). */
const CLARITY_BLOCKED = ['/plan', '/compte', '/connexion', '/mot-de-passe', '/admin'];

export function clarityAllowed(internalPath: string): boolean {
  return !CLARITY_BLOCKED.some((p) => internalPath === p || internalPath.startsWith(`${p}/`));
}
