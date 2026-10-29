import { useTranslations } from 'next-intl';
import { FuseoMark } from '@/components/brand/FuseoMark';
import { Link } from '@/i18n/navigation';
import { AuthButton } from '@/components/auth/AuthButton';
import type { SlugMap } from '@/content/blog';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './SiteHeader.module.css';

export function SiteHeader({ slugs }: { slugs: SlugMap }) {
  const t = useTranslations('nav');

  return (
    <header className={styles.header}>
      <div className={styles.progress} aria-hidden="true" />
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label={t('home')}>
          <FuseoMark />
          <b>fuseo</b>
        </Link>
        <nav className={styles.nav} aria-label={t('menu')}>
          <Link href="/la-science">{t('science')}</Link>
          <Link href="/methode">{t('method')}</Link>
          <Link href="/equipe">{t('team')}</Link>
          <Link href="/blog">{t('blog')}</Link>
          <Link href="/tarifs">{t('pricing')}</Link>
        </nav>
        <div className={styles.actions}>
          <LanguageSwitcher slugs={slugs} />
          <AuthButton className={styles.login} />
          <Link href="/plan" className={styles.cta}>
            {t('cta')}
          </Link>
        </div>
      </div>
    </header>
  );
}
