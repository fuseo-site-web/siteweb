import type { Metadata } from 'next';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { routing, type StaticPathname as AppPathname } from '@/i18n/routing';

const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

export function absoluteUrl(pathname: AppPathname, locale: string): string {
  return base + getPathname({ href: pathname, locale: locale as (typeof routing.locales)[number] });
}

/** Description ≤ 155 caractères, coupée en fin de phrase ou de mot. */
export function summarize(text: string, max = 155): string {
  const t = text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '));
  return stop > 60
    ? cut.slice(0, stop + 1)
    : cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

const SHORT: Record<string, string> = {
  fr: 'Plan anti-jet lag',
  en: 'Anti-jet lag plan',
  es: 'Plan antijet lag',
};
const TAGLINE: Record<string, string> = {
  fr: 'Plan anti-jet lag personnalisé, conçu par des spécialistes du sommeil.',
  en: 'Personalized anti-jet lag plan, designed by sleep specialists.',
  es: 'Plan antijet lag personalizado, diseñado por especialistas del sueño.',
};
// Titres plus courts pour le navigateur et Google (le titre de la page, lui, reste complet).
const SEO_TITLE: Partial<Record<AppPathname, Record<string, string>>> = {
  '/': {
    fr: 'Fuseo · Plan anti-jet lag personnalisé',
    en: 'Fuseo · Personalized anti-jet lag plan',
    es: 'Fuseo · Plan antijet lag personalizado',
  },
  '/la-science': {
    fr: 'La science du jet lag · Fuseo',
    en: 'The science of jet lag · Fuseo',
    es: 'La ciencia del jet lag · Fuseo',
  },
};

/** Titre d'onglet et de résultat Google : entre 20 et 60 caractères. */
export function seoTitle(title: string, pathname: AppPathname, locale: string): string {
  const override = SEO_TITLE[pathname]?.[locale];
  if (override) return override;
  const short = SHORT[locale] ?? SHORT.fr!;
  if (title.length < 20) {
    return `${title} · ${/fuseo/i.test(title) ? short : `Fuseo · ${short}`}`;
  }
  if (title.length > 60) {
    const cut = title.slice(0, 58);
    return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:·-]$/, '')}…`;
  }
  return title;
}

/** Description de 70 à 155 caractères : trop courte, on la complète avec la phrase de présentation du site. */
export function seoDescription(description: string, locale: string): string {
  const d = summarize(description);
  if (d.length >= 70) return d;
  const end = /[.!?…]$/.test(d) ? d : `${d}.`;
  return `${end} ${TAGLINE[locale] ?? TAGLINE.fr}`;
}

export const OG_IMAGE = {
  url: `${base}/images/og-fuseo.jpg`,
  width: 1200,
  height: 630,
  alt: 'Fuseo',
};

export function pageMetadata({
  locale,
  pathname,
  title,
  description,
  noindex,
}: {
  locale: string;
  pathname: AppPathname;
  title: string;
  description: string;
  noindex?: boolean;
}): Metadata {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(pathname, l)]));
  const fullTitle = seoTitle(title, pathname, locale);
  const fullDescription = seoDescription(description, locale);
  return {
    title: fullTitle,
    description: fullDescription,
    alternates: {
      canonical: absoluteUrl(pathname, locale),
      languages: { ...languages, 'x-default': absoluteUrl(pathname, routing.defaultLocale) },
    },
    openGraph: {
      type: 'website',
      title: fullTitle,
      description: fullDescription,
      images: [OG_IMAGE],
      url: absoluteUrl(pathname, locale),
      siteName: 'Fuseo',
      locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [OG_IMAGE.url],
    },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
