import { routing } from '@/i18n/routing';

export interface ProfileRow {
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  country: string | null;
  home_airport: string | null;
}

/** Première connexion terminée : les cinq informations d'identité sont renseignées. */
export function isProfileComplete(p: ProfileRow | null | undefined): boolean {
  return !!(p?.first_name && p.last_name && p.birth_date && p.country && p.home_airport);
}

/** Redirection relative uniquement (pas de redirection ouverte). */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
}

type Locale = (typeof routing.locales)[number];
const localeOf = (path: string): Locale =>
  routing.locales.find((l) => path === `/${l}` || path.startsWith(`/${l}/`)) ??
  routing.defaultLocale;

/** Adresse localisée de l'espace compte (pas de préfixe pour la langue par défaut). */
function accountPath(locale: Locale): string {
  const entry = routing.pathnames['/compte'];
  const path = typeof entry === 'string' ? entry : entry[locale];
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

/**
 * Où envoyer l'utilisateur juste après sa connexion : s'il n'a pas encore rempli ses informations,
 * vers l'espace compte (écran de bienvenue), en gardant la page d'origine pour la suite.
 */
export function pathAfterSignIn(profile: ProfileRow | null | undefined, next: string): string {
  if (isProfileComplete(profile)) return next;
  const locale = localeOf(next);
  const account = accountPath(locale);
  if (next === account || next.startsWith(`${account}?`)) return next;
  return `${account}?next=${encodeURIComponent(next)}`;
}
