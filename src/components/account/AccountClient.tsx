'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  cancelAccountDeletion,
  deleteTrip,
  grantHealthConsent,
  requestAccountDeletion,
  signOutAction,
  withdrawHealthConsent,
} from '@/app/actions/account';
import { DELETION_REASONS, type DeletionReason } from '@/lib/account/deletion';
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

/**
 * « Supprimer mon compte » ouvre une demande : un motif (sélection rapide) et un commentaire facultatif.
 * L'équipe supprime ensuite le compte depuis l'espace admin ; tant que ce n'est pas fait, la demande s'annule ici.
 */
export function DeleteAccount({ pendingSince }: { pendingSince: string | null }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const { run, pending, error } = useAction();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<DeletionReason | null>(null);
  const [comment, setComment] = useState('');

  if (pendingSince)
    return (
      <div>
        <p role="status" className={styles.pendingNote}>
          {t('deletionPending', { date: pendingSince })}
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghost}
            disabled={pending}
            onClick={() => run(cancelAccountDeletion)}
          >
            {t('deletionCancel')}
          </button>
        </div>
        {error ? (
          <p role="alert" className={styles.err}>
            {error}
          </p>
        ) : null}
      </div>
    );

  if (!open)
    return (
      <div className={styles.actions}>
        <button type="button" className={styles.dangerGhost} onClick={() => setOpen(true)}>
          {t('danger')}
        </button>
      </div>
    );

  return (
    <form
      className={styles.deletionForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!reason) return;
        run(() => requestAccountDeletion({ reason, comment: comment.trim() || undefined, locale }));
      }}
    >
      <fieldset>
        <legend>{t('deletionQuestion')}</legend>
        <div className={styles.chips}>
          {DELETION_REASONS.map((r) => (
            <label key={r} data-on={reason === r || undefined}>
              <input
                type="radio"
                name="deletion-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
              />
              {t(`deletionReason.${r}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="deletion-comment">{t('deletionComment')}</label>
      <textarea
        id="deletion-comment"
        value={comment}
        maxLength={1000}
        placeholder={t('deletionCommentPh')}
        onChange={(e) => setComment(e.target.value)}
      />
      <p className={styles.hint}>{t('deletionInfo')}</p>
      <div className={styles.actions}>
        <button type="submit" className={styles.danger} disabled={!reason || pending}>
          {t('deletionSend')}
        </button>
        <button type="button" className={styles.ghost} onClick={() => setOpen(false)}>
          {t('cancel')}
        </button>
      </div>
      {error ? (
        <p role="alert" className={styles.err}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
