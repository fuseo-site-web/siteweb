'use client';

import { useState, useTransition } from 'react';
import { setUserRole } from '@/app/admin/actions-roles';
import styles from './Admin.module.css';

const LABEL = { client: 'Client', tester: 'Testeur', admin: 'Admin' } as const;
type Role = keyof typeof LABEL;

/** Sélecteur de rôle d'un compte, enregistré dès le changement. */
export function RoleSelect({
  id,
  email,
  role,
  locked,
}: {
  id: string;
  email: string;
  role: Role;
  locked?: string;
}) {
  const [value, setValue] = useState<Role>(role);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  if (locked)
    return (
      <span className={`${styles.pill} ${styles.ok}`} title={locked}>
        {LABEL[role]}
      </span>
    );

  return (
    <div className={styles.roleCell}>
      <select
        className={styles.roleSelect}
        aria-label={`Rôle de ${email}`}
        value={value}
        disabled={pending}
        data-role={value}
        onChange={(e) => {
          const next = e.target.value as Role;
          const prev = value;
          setValue(next);
          setError('');
          start(async () => {
            const r = await setUserRole({ id, role: next });
            if (!r.ok) {
              setValue(prev);
              setError(r.error);
            }
          });
        }}
      >
        {(Object.keys(LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>
            {LABEL[r]}
          </option>
        ))}
      </select>
      {error ? (
        <small role="alert" className={styles.roleError}>
          {error}
        </small>
      ) : null}
    </div>
  );
}
