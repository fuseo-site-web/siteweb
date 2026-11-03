'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { setViewOffer } from '@/app/actions/view-as';
import planner from '@/components/planner/Planner.module.css';
import styles from './Account.module.css';

/** Réservé aux admins : choisir l'offre avec laquelle voir le plan, le PDF et l'espace. */
export function ViewAsSelect({
  value,
  options,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
}) {
  const t = useTranslations('account');
  const router = useRouter();
  const id = useId();
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className={planner.field}>
      <label htmlFor={id}>{t('viewAsLabel')}</label>
      <select
        id={id}
        value={current}
        disabled={pending}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          const next = e.target.value;
          const prev = current;
          setCurrent(next);
          setError(false);
          start(async () => {
            const r = await setViewOffer(next);
            if (!r.ok) {
              setCurrent(prev);
              return setError(true);
            }
            router.refresh();
          });
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <small id={`${id}-hint`} className={styles.hint}>
        {t('viewAsHint')}
      </small>
      {error ? (
        <p role="alert" className={styles.err}>
          {t('error')}
        </p>
      ) : null}
    </div>
  );
}
