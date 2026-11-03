import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Reveal } from '@/components/ui/Reveal';
import { Link } from '@/i18n/navigation';
import styles from './HomeFinale.module.css';

export async function HomeFinale({ locale }: { locale: string }) {
  const [t, team] = await Promise.all([
    getTranslations({ locale, namespace: 'home2' }),
    getTranslations({ locale, namespace: 'team' }),
  ]);

  return (
    <>
      <section className={styles.expertise} aria-labelledby="home-expertise">
        <div className={styles.wrap}>
          <Reveal className={styles.expertiseCopy}>
            <p className={styles.eyebrow}>Institut Médical du Sommeil · Paris</p>
            <h2 id="home-expertise">{t('expertiseTitle')}</h2>
            <p>{t('expertiseText')}</p>
            <Link href="/equipe" className={styles.link}>
              {t('expertiseLink')} →
            </Link>
          </Reveal>
          <Reveal className={styles.teamCard} delay={100}>
            <Image
              src="/images/institut-medical-du-sommeil.png"
              alt="Institut Médical du Sommeil"
              width={351}
              height={120}
            />
            {/* Portraits déjà en WebP (240 px) : servis tels quels, sans conversion à la volée. */}
            <div className={styles.doctors}>
              <Image
                src="/images/dr-jonathan-taieb.webp"
                unoptimized
                alt="Dr Jonathan Taieb"
                width={88}
                height={88}
              />
              <Image
                src="/images/dr-maxime-elbaz.webp"
                unoptimized
                alt="Dr Maxime Elbaz"
                width={88}
                height={88}
              />
            </div>
            <p>{team('committeeSub')}</p>
          </Reveal>
        </div>
      </section>
      <section className={styles.finalCta} aria-labelledby="home-final-cta">
        <div className={styles.wrap}>
          <Reveal>
            <h2 id="home-final-cta">{t('ctaTitle')}</h2>
            <p>{t('ctaText')}</p>
            <Link href="/plan" className={styles.button}>
              {t('ctaButton')} →
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
