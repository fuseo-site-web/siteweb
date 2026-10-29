import { useTranslations } from 'next-intl';
import styles from './ClocksCard.module.css';

const Sun = () => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path fill="currentColor" d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

export function ClocksCard() {
  const t = useTranslations('clocks');

  return (
    <aside className={styles.card} aria-labelledby="clocks-title">
      <h2 id="clocks-title">{t('title')}</h2>
      <p className={styles.big}>{t('big')}</p>

      <div className={styles.label}>{t('local')}</div>
      <div className={styles.bar}>
        <span className={styles.night} style={{ left: 0, width: '29.2%' }}>
          <Moon /> {t('night')}
        </span>
        <span className={styles.day} style={{ left: '29.2%', width: '66.6%' }}>
          <Sun /> {t('day')}
        </span>
        <span className={styles.night} style={{ left: '95.8%', width: '4.2%' }} />
      </div>

      <div className={styles.label}>{t('body')}</div>
      <div className={styles.bar}>
        <span className={styles.day} style={{ left: 0, width: '25%' }}>
          <Sun />
        </span>
        <span className={styles.night} style={{ left: '25%', width: '33.3%' }}>
          <Moon /> {t('night')}
        </span>
        <span className={styles.day} style={{ left: '58.3%', width: '41.7%' }}>
          <Sun /> {t('day')}
        </span>
        <span className={styles.clash} style={{ left: '25%', width: '33.3%' }} aria-hidden="true" />
      </div>

      <div className={styles.ticks} aria-hidden="true">
        <span>0 h</span>
        <span>6 h</span>
        <span>12 h</span>
        <span>18 h</span>
        <span>24 h</span>
      </div>

      <ul className={styles.notes}>
        <li>
          <b>{t('e1a')}</b> {t('e1b')}
        </li>
        <li>
          <b>{t('e2a')}</b>
          {t('e2b')}
        </li>
        <li>
          <b>Fuseo</b> {t('e3b')}
        </li>
      </ul>
    </aside>
  );
}
