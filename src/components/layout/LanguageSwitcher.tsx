'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
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

export function LanguageSwitcher() {
  const current = useLocale();
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <div className={styles.lang} role="group" aria-label={t('language')}>
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          // Un article de blog a un slug propre à chaque langue : on renvoie vers l'index du blog.
          href={pathname === '/blog/[slug]' ? '/blog' : pathname}
          locale={locale}
          lang={locale}
          hrefLang={locale}
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
