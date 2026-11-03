'use client';

import { useState, useTransition } from 'react';
import { setUserOffer } from '@/app/admin/actions-offers';
import styles from './Admin.module.css';

export const OFFER_LABEL: Record<string, string> = {
  free: 'Gratuit',
  voyage: 'Un voyage',
  annuel: 'Grand voyageur',
  ami: 'Accès invité',
  pro: 'Fuseo Pro',
};

/** Offre accordée manuellement par l'admin, enregistrée dès le changement. Les achats s'affichent à part. */
export function OfferSelect({
  id,
  email,
  offer,
  paid,
}: {
  id: string;
  email: string;
  offer: string;
  paid: string | null;
}) {
  const [value, setValue] = useState(offer);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  return (
    <div className={styles.roleCell}>
      <select
        className={styles.roleSelect}
        aria-label={`Offre accordée à ${email}`}
        value={value}
        disabled={pending}
        data-offer={value === 'free' ? 'free' : 'paid'}
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          setError('');
          start(async () => {
            const r = await setUserOffer({ id, offer: next });
            if (!r.ok) {
              setValue(prev);
              setError(r.error);
            }
          });
        }}
      >
        {Object.entries(OFFER_LABEL).map(([v, label]) => (
          <option key={v} value={v}>
            {v === 'free' ? label : `${label} (offert)`}
          </option>
        ))}
      </select>
      {paid ? (
        <span className={`${styles.pill} ${styles.ok}`}>Payé : {OFFER_LABEL[paid] ?? paid}</span>
      ) : null}
      {error ? (
        <small role="alert" className={styles.roleError}>
          {error}
        </small>
      ) : null}
    </div>
  );
}
