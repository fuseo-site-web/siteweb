'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { SlugMap } from '@/content/blog';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPathname, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import styles from './SiteHeader.module.css';

const FLAGS: Record<string, React.ReactNode> = {
  fr: (
    <svg viewBox="0 0 3 2" aria-hidden="true">
      <rect width="1" height="2" fill="#0055A4" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#EF4135" />
    </svg>
  ),
  en: (
    <svg viewBox="0 0 60 30" aria-hidden="true">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#C8102E" strokeWidth="3" />
      <path d="M30,0v30M0,15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0v30M0,15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  ),
  es: (
    <svg viewBox="0 0 3 2" aria-hidden="true">
      <rect width="3" height="2" fill="#AA151B" />
      <rect y=".5" width="3" height="1" fill="#F1BF00" />
    </svg>
  ),
};
const NAMES: Record<string, string> = { fr: 'Français', en: 'English', es: 'Español' };

export function LanguageSwitcher({ slugs }: { slugs: SlugMap }) {
  const current = useLocale();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const params = useParams<{ slug?: string }>();
  // Côté serveur le chemin est « /blog/[slug] », côté navigateur il contient le slug : on gère les deux.
  const isArticle = pathname === '/blog/[slug]' || /^\/blog\/[^/]+$/.test(pathname);
  const article = isArticle ? (params.slug ?? /^\/blog\/([^/]+)$/.exec(pathname)?.[1]) : undefined;

  const targetFor = (locale: string) => {
    if (!isArticle) return pathname as Exclude<typeof pathname, '/blog/[slug]'>;
    const slug = article ? slugs[article]?.[locale as 'fr' | 'en' | 'es'] : undefined;
    return slug ? { pathname: '/blog/[slug]' as const, params: { slug } } : '/blog';
  };

  return (
    <div className={styles.lang} role="group" aria-label={t('language')}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          // Un article de blog a un slug propre à chaque langue : on renvoie vers sa traduction, sinon vers l'index.
          href={getPathname({ href: targetFor(locale), locale })}
          lang={locale}
          aria-label={NAMES[locale]}
          aria-current={locale === current ? 'true' : undefined}
          title={NAMES[locale]}
          scroll={false}
        >
          {FLAGS[locale]}
        </Link>
      ))}
    </div>
  );
}
