import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/ui/Reveal';
import styles from './Sections.module.css';

const ICONS: React.ReactNode[] = [
  <path
    key="b"
    d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 7h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM3 12h18"
  />,
  <path
    key="p"
    fill="currentColor"
    stroke="none"
    d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
  />,
  <path
    key="s"
    d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4v4h-4z"
  />,
  <path
    key="f"
    d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M5 8h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8v12M15 8v12"
  />,
];

export function Audience() {
  const t = useTranslations('audience');
  return (
    <section id="pour-qui" className={styles.sec} aria-labelledby="audience-title">
      <div className={styles.wrap}>
        <Reveal>
          <h2 id="audience-title" className={styles.title}>
            {t('title')}
          </h2>
          <p className={styles.sub}>{t('sub')}</p>
        </Reveal>
        <ul className={styles.audience}>
          {[1, 2, 3, 4].map((n, i) => (
            <Reveal as="li" key={n} delay={i * 90}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[i]}
              </svg>
              <h3>{t(`a${n}.t`)}</h3>
              <p>{t(`a${n}.p`)}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
