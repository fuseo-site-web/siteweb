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
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(pathname, locale),
      languages: { ...languages, 'x-default': absoluteUrl(pathname, routing.defaultLocale) },
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl(pathname, locale),
      siteName: 'Fuseo',
      locale,
    },
    twitter: { card: 'summary', title, description },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
