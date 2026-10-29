import { useTranslations } from 'next-intl';
import preview from '@/content/home-preview.json';
import { Reveal } from '@/components/ui/Reveal';
import type { PreviewDay } from './DayTimeline';
import { ScrollySteps } from './ScrollySteps';
import styles from './Sections.module.css';

export function Steps() {
  const t = useTranslations();
  const day = (preview.days as PreviewDay[]).find((d) => d.key === 'first')!;

  return (
    <section id="methode" className={`${styles.sec} ${styles.band}`} aria-labelledby="steps-title">
      <div className={styles.wrap}>
        <Reveal>
          <h2 id="steps-title" className={styles.title}>
            {t('steps.title')}
          </h2>
        </Reveal>
        <ScrollySteps
          text={{
            title: t('steps.title'),
            note: t('steps.note'),
            bed: t('steps.bed'),
            wake: t('steps.wake'),
            paris: t('steps.paris'),
            tokyo: t('steps.tokyo'),
            steps: [1, 2, 3].map((n) => ({ title: t(`steps.s${n}.t`), text: t(`steps.s${n}.p`) })),
          }}
          day={day}
          labels={{
            sleep: t('preview.sleepItem'),
            seek: t('preview.seek'),
            avoid: t('preview.avoid'),
            caf: t('preview.caf'),
            flight: t('preview.flightItem'),
          }}
        />
        <p className={styles.note} style={{ textAlign: 'center' }}>
          {t('steps.note')}
        </p>
      </div>
    </section>
  );
}
