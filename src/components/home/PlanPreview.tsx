import { useFormatter, useTranslations } from 'next-intl';
import preview from '@/content/home-preview.json';
import { Link } from '@/i18n/navigation';
import { Reveal } from '@/components/ui/Reveal';
import { DayTimeline, type PreviewDay } from './DayTimeline';
import styles from './Sections.module.css';

export function PlanPreview() {
  const t = useTranslations();
  const format = useFormatter();
  const labels = {
    sleep: t('preview.sleepItem'),
    seek: t('preview.seek'),
    avoid: t('preview.avoid'),
    caf: t('preview.caf'),
    flight: t('preview.flightItem'),
  };

  return (
    <section id="apercu" className={styles.sec} aria-labelledby="apercu-title">
      <div className={styles.wrap}>
        <Reveal>
          <h2 id="apercu-title" className={styles.title}>
            {t('preview.title')}
          </h2>
          <p className={styles.sub}>{t('preview.sub')}</p>
        </Reveal>
        <Reveal className={styles.previewCard}>
          <div className={styles.previewHead}>
            <div className={styles.route}>
              {t('steps.paris')}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  transform="rotate(90 12 12)"
                  d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
                />
              </svg>
              {t('steps.tokyo')}
            </div>
            <span className={styles.tag}>{t('preview.sleep')}</span>
          </div>
          <div className={styles.days}>
            {(preview.days as PreviewDay[]).map((d, i) => (
              <Reveal key={d.key} delay={i * 120} className={styles.dayCard}>
                <div className={styles.dayLabel}>
                  <b>
                    {t(
                      `preview.${d.key === 'eve' ? 'eve' : d.key === 'flight' ? 'flight' : 'first'}`,
                    )}
                  </b>
                  <span>
                    {format.dateTime(new Date(`${d.date}T12:00:00Z`), {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'UTC',
                    })}
                  </span>
                </div>
                <DayTimeline day={d} labels={labels} />
              </Reveal>
            ))}
          </div>
          <p className={styles.note}>{t('preview.note')}</p>
          <Link href="/plan" className={styles.btn}>
            {t('preview.cta')}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
