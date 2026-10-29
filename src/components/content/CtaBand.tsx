import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { Link } from '@/i18n/navigation';
import styles from './Content.module.css';

/** Bandeau d'appel final : calculer son plan. Textes communs aux pages éditoriales. */
export async function CtaBand({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'blog' });
  return (
    <Reveal className={styles.cta}>
      <span className={styles.ctaIcon}>
        <Icon name="plane" size={26} />
      </span>
      <div>
        <b>{t('ctaTitle')}</b>
        <p>{t('ctaText')}</p>
      </div>
      <Link href="/plan" className={styles.ctaBtn}>
        {t('ctaBtn')}
        <Icon name="arrow-right" size={18} />
      </Link>
    </Reveal>
  );
}
