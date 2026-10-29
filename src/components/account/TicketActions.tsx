'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { deleteTrip } from '@/app/actions/account';
import { PdfActions } from '@/components/planner/PdfActions';
import { Link } from '@/i18n/navigation';
import styles from './Ticket.module.css';

/** Actions d'un billet : ouvrir le plan, PDF / partage, suppression avec confirmation. */
export function TicketActions({ id }: { id: string }) {
  const t = useTranslations('account');
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className={styles.actions}>
      <Link href={{ pathname: '/plan', query: { trip: id } }} className={styles.open}>
        {t('open')}
      </Link>
      <div className={styles.small}>
        <PdfActions source={{ kind: 'trip', id }} buttonClass={styles.linkBtn} compact />
      </div>
      {confirm ? (
        <span className={styles.confirm}>
          {t('deleteTripConfirm')}
          <button
            type="button"
            className={styles.dangerBtn}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteTrip(id);
                if (r.ok) router.refresh();
              })
            }
          >
            {t('confirm')}
          </button>
          <button type="button" className={styles.linkBtn} onClick={() => setConfirm(false)}>
            {t('cancel')}
          </button>
        </span>
      ) : (
        <button type="button" className={styles.linkBtn} onClick={() => setConfirm(true)}>
          {t('delete')}
        </button>
      )}
    </div>
  );
}
