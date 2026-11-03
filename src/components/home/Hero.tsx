import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PLANE_PATH } from '@/components/brand/FuseoMark';
import { HERO_IMAGE } from '@/lib/site-images';
import { Link } from '@/i18n/navigation';
import { FlightFinder } from './FlightFinder';
import styles from './Hero.module.css';

export function Hero() {
  const t = useTranslations();

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Image
        src={HERO_IMAGE.src}
        alt={t('hero.imageAlt')}
        fill
        priority
        fetchPriority="high"
        sizes="(min-width: 961px) 104vw, 100vw"
        quality={75}
        className={styles.bg}
      />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <h1 id="hero-title">
            <span className={styles.line}>{t('hero.titleLine1')}</span>
            <span className={styles.line}>{t('hero.titleLine2')}</span>
            <span className={`${styles.line} ${styles.promise}`}>{t('hero.titleLine3')}</span>
            <span className={`${styles.line} ${styles.promise}`}>{t('hero.titleLine4')}</span>
          </h1>
          <p className={styles.lead}>{t('hero.lead')}</p>
          <div className={styles.endorse}>
            <span className={styles.chip}>
              <Image
                src="/images/institut-medical-du-sommeil.png"
                alt={t('brand.logoAlt')}
                width={351}
                height={120}
              />
            </span>
            <span>{t('hero.endorse')}</span>
          </div>
          <div className={styles.buttons}>
            <Link href="/plan" className={styles.primary}>
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                className={styles.planeIcon}
              >
                <path d={PLANE_PATH} fill="currentColor" transform="rotate(90 12 12)" />
              </svg>
              {t('hero.cta')}
            </Link>
            <a href="#apercu" className={styles.ghost}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"
                  fill="currentColor"
                />
              </svg>
              {t('hero.example')}
            </a>
          </div>
        </div>
        <FlightFinder />
      </div>
    </section>
  );
}
