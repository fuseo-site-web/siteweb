import { useTranslations } from 'next-intl';
import { ManageCookies } from '@/components/consent/ManageCookies';
import { FuseoMark } from '@/components/brand/FuseoMark';
import { Link } from '@/i18n/navigation';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  const t = useTranslations();

  return (
    <footer className={styles.footer}>
      <p className={styles.disclaimer}>{t('footer.disclaimer')}</p>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label={t('nav.home')}>
          <FuseoMark size={28} />
          <b>fuseo</b>
        </Link>
        <p className={styles.credit}>
          {t('footer.madeBy')}{' '}
          <a href="https://webfityou.com" target="_blank" rel="noopener">
            WebFitYou
          </a>
        </p>
        <nav className={styles.links} aria-label={t('footer.legal')}>
          <Link href="/plan-du-site">{t('footer.sitemap')}</Link>
          <Link href="/mentions-legales">{t('pages.mentions')}</Link>
          <Link href="/cgv">{t('footer.cgv')}</Link>
          <Link href="/cgu">{t('footer.cgu')}</Link>
          <Link href="/confidentialite">{t('footer.privacy')}</Link>
          <Link href="/cookies">{t('footer.cookies')}</Link>
          <ManageCookies className={styles.manage} />
          <Link href="/accessibilite">{t('footer.accessibility')}</Link>
        </nav>
      </div>
    </footer>
  );
}
