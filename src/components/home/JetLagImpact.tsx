import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/ui/Reveal';
import styles from './JetLagImpact.module.css';

const SCENES = [
  { key: 'holiday', src: '/images/home/impact-japan.webp' },
  { key: 'business', src: '/images/home/impact-business.webp' },
  { key: 'event', src: '/images/home/impact-wedding.webp' },
] as const;

export function JetLagImpact() {
  const t = useTranslations('impact');
  return (
    <section className={styles.section} aria-labelledby="impact-title">
      <div className={styles.wrap}>
        <Reveal>
          <h2 id="impact-title">{t('title')}</h2>
          <p className={styles.lead}>{t('lead')}</p>
        </Reveal>
        <div className={styles.grid}>
          {SCENES.map((scene, index) => (
            <Reveal as="article" key={scene.key} delay={index * 90} className={styles.card}>
              <Image
                src={scene.src}
                alt={t(`${scene.key}.alt`)}
                width={1536}
                height={1024}
                sizes="(max-width: 760px) 100vw, 33vw"
              />
              <div className={styles.text}>
                <h3>{t(`${scene.key}.title`)}</h3>
                <p>{t(`${scene.key}.text`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
