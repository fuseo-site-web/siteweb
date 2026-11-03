'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { deleteClient } from '@/app/admin/actions-delete';
import styles from './Admin.module.css';

/** Suppression d'un compte en deux temps : un clic ouvre la confirmation, le second supprime. */
export function DeleteClientButton({
  id,
  email,
  locked,
}: {
  id: string;
  email: string;
  locked?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  if (locked)
    return (
      <span className={styles.muted} title={locked}>
        —
      </span>
    );

  if (!confirm)
    return (
      <button
        type="button"
        className={styles.iconDanger}
        aria-label={`Supprimer le compte ${email}`}
        title="Supprimer ce compte et ses données"
        onClick={() => setConfirm(true)}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    );

  return (
    <div
      className={styles.confirmBox}
      role="group"
      aria-label={`Confirmer la suppression de ${email}`}
    >
      <small>Supprimer {email} et toutes ses données ? Action définitive.</small>
      <div>
        <button
          type="button"
          className={styles.btnDanger}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await deleteClient({ id });
              if (!r.ok) setError(r.error);
            })
          }
        >
          {pending ? 'Suppression…' : 'Supprimer'}
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          disabled={pending}
          onClick={() => {
            setConfirm(false);
            setError('');
          }}
        >
          Annuler
        </button>
      </div>
      {error ? (
        <small role="alert" className={styles.roleError}>
          {error}
        </small>
      ) : null}
    </div>
  );
}
