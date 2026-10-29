'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  deleteAccount,
  deleteTrip,
  grantHealthConsent,
  signOutAction,
  withdrawHealthConsent,
} from '@/app/actions/account';
import styles from './Account.module.css';

function useAction() {
  const router = useRouter();
  const t = useTranslations('account');
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const run = (fn: () => Promise<{ ok: boolean }>, after?: () => void) =>
    start(async () => {
      setError('');
      const r = await fn();
      if (!r.ok) return setError(t('error'));
      after?.();
      router.refresh();
    });
  return { run, pending, error };
}

export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations('account');
  const router = useRouter();
  const { run, pending } = useAction();
  return (
    <button
      type="button"
      className={className ?? styles.ghost}
      disabled={pending}
      onClick={() => run(signOutAction, () => router.push('/'))}
    >
      {t('signOut')}
    </button>
  );
}

export function DeleteTripButton({ id }: { id: string }) {
  const t = useTranslations('account');
  const { run, pending } = useAction();
  return (
    <button
      type="button"
      className={styles.link}
      disabled={pending}
      onClick={() => run(() => deleteTrip(id))}
    >
      {t('delete')}
    </button>
  );
}

export function HealthConsent({ granted }: { granted: boolean }) {
  const t = useTranslations('account');
  const { run, pending, error } = useAction();
  const [checked, setChecked] = useState(false);
  const [confirm, setConfirm] = useState(false);

  return granted ? (
    <div className={styles.actions}>
      <a className={styles.ghost} href="/api/account/export" download>
        {t('export')}
      </a>
      {confirm ? (
        <>
          <button
            type="button"
            className={styles.danger}
            disabled={pending}
            onClick={() => run(withdrawHealthConsent, () => setConfirm(false))}
          >
            {t('confirm')}
          </button>
          <button type="button" className={styles.ghost} onClick={() => setConfirm(false)}>
            {t('cancel')}
          </button>
        </>
      ) : (
        <button type="button" className={styles.dangerGhost} onClick={() => setConfirm(true)}>
          {t('withdraw')}
        </button>
      )}
      {error ? (
        <p role="alert" className={styles.err}>
          {error}
        </p>
      ) : null}
    </div>
  ) : (
    <div>
      <label className={styles.consent}>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{t('consentText')}</span>
      </label>
      <button
        type="button"
        className={styles.primary}
        disabled={!checked || pending}
        onClick={() => run(grantHealthConsent)}
      >
        {t('grant')}
      </button>
      {error ? (
        <p role="alert" className={styles.err}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DeleteAccount() {
  const t = useTranslations('account');
  const router = useRouter();
  const { run, pending, error } = useAction();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={styles.actions}>
      {confirm ? (
        <>
          <button
            type="button"
            className={styles.danger}
            disabled={pending}
            onClick={() => run(deleteAccount, () => router.push('/'))}
          >
            {t('deleteAccount')}
          </button>
          <button type="button" className={styles.ghost} onClick={() => setConfirm(false)}>
            {t('cancel')}
          </button>
        </>
      ) : (
        <button type="button" className={styles.dangerGhost} onClick={() => setConfirm(true)}>
          {t('danger')}
        </button>
      )}
      {error ? (
        <p role="alert" className={styles.err}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
