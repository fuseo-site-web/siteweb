'use client';

import { Cookie } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useConsent } from './ConsentProvider';
import styles from './Consent.module.css';

export function ConsentBanner() {
  const t = useTranslations('consent');
  const { open, consent, save, close } = useConsent();
  const [detail, setDetail] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const titleId = useId();
  const descId = useId();

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={styles.card}
    >
      <div className={styles.head}>
        <span className={styles.chip} aria-hidden="true">
          <Cookie size={18} />
        </span>
        <h2 id={titleId} className={styles.title}>
          {t('title')}
        </h2>
      </div>
      <p id={descId} className={styles.text}>
        {t('body')}{' '}
        <Link href="/cookies" className={styles.more}>
          {t('more')}
        </Link>
      </p>

      {detail && (
        <div className={styles.detail}>
          <div className={styles.row}>
            <div>
              <b>{t('necessary')}</b>
              <p>{t('necessaryDesc')}</p>
            </div>
            <span className={styles.always}>{t('always')}</span>
          </div>
          <label className={styles.row}>
            <div>
              <b>{t('analytics')}</b>
              <p>{t('analyticsDesc')}</p>
            </div>
            <input
              type="checkbox"
              className={styles.switch}
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
          </label>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={() => save(false)}>
          {t('refuseAll')}
        </button>
        <button type="button" className={styles.btn} onClick={() => save(true)}>
          {t('acceptAll')}
        </button>
        {detail ? (
          <button type="button" className={styles.link} onClick={() => save(analytics)}>
            {t('save')}
          </button>
        ) : (
          <button
            type="button"
            className={styles.link}
            aria-expanded={false}
            onClick={() => {
              setAnalytics(consent?.analytics === true);
              setDetail(true);
            }}
          >
            {t('customize')}
          </button>
        )}
      </div>
      {consent && (
        <button type="button" className={styles.close} onClick={close}>
          {t('close')}
        </button>
      )}
    </section>
  );
}
