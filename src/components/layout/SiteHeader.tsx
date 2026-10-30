import { useTranslations } from 'next-intl';
import { FuseoMark } from '@/components/brand/FuseoMark';
import { Link } from '@/i18n/navigation';
import { AuthButton } from '@/components/auth/AuthButton';
import type { SlugMap } from '@/content/blog';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';
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
          <Link href="/contact">{t('contact')}</Link>
        </nav>
        <div className={styles.actions}>
          <LanguageSwitcher slugs={slugs} />
          <AuthButton className={styles.login} />
          <Link href="/plan" className={styles.cta}>
            {t('cta')}
          </Link>
          <MobileMenu
            openLabel={t('openMenu')}
            closeLabel={t('closeMenu')}
            menuLabel={t('menu')}
            items={[
              { href: '/la-science', label: t('science') },
              { href: '/methode', label: t('method') },
              { href: '/equipe', label: t('team') },
              { href: '/blog', label: t('blog') },
              { href: '/tarifs', label: t('pricing') },
              { href: '/contact', label: t('contact') },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
