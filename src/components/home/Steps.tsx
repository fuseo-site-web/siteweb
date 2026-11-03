import { useTranslations } from 'next-intl';
import { HowItWorks } from './HowItWorks';
import how from './HowItWorks.module.css';
import styles from './Sections.module.css';

/** Icône de chaque conseil de l'étape 3 (le texte vient des traductions). */
const PHASE_ITEMS = {
  before: ['light', 'coffee', 'sport'],
  during: ['sleep', 'meal', 'alcohol'],
  after: ['meal', 'light', 'alcohol'],
} as const;

export function Steps() {
  const t = useTranslations();

  return (
    <section id="methode" className={how.section} aria-labelledby="steps-title">
      <div className={styles.wrap}>
        <HowItWorks
          text={{
            title: t('steps.title'),
            note: t('steps.note'),
            eyebrow: t('steps.eyebrow'),
            search: {
              placeholder: t('steps.search.placeholder'),
              departures: t('steps.search.departures'),
              cities: t('steps.search.cities').split('|'),
              paris: t('steps.paris'),
              tokyo: t('steps.tokyo'),
            },
            benefits: [1, 2, 3, 4].map((n) => t(`steps.benefit${n}`)),
            bed: t('steps.bed'),
            wake: t('steps.wake'),
            paris: t('steps.paris'),
            tokyo: t('steps.tokyo'),
            phases: (['before', 'during', 'after'] as const).map((ph) => ({
              title: t(`steps.phase.${ph}.title`),
              items: PHASE_ITEMS[ph].map((icon, i) => ({
                icon,
                text: t(`steps.phase.${ph}.i${i + 1}`),
                short: t(`steps.phase.${ph}.s${i + 1}`),
              })),
            })),
            steps: [1, 2, 3].map((n) => ({ title: t(`steps.s${n}.t`), text: t(`steps.s${n}.p`) })),
          }}
        />
      </div>
    </section>
  );
}
