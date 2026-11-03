'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getPathname } from '@/i18n/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import styles from './Account.module.css';

/**
 * Ajout ou modification du mot de passe par lien e-mail. Un compte créé avec Google n'a pas de mot de passe :
 * le lien (même mécanisme que « mot de passe oublié ») ouvre une session de récupération sur la page
 * « Nouveau mot de passe », qui enregistre le mot de passe sur le même compte.
 */
export function PasswordAccess({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function send() {
    setState('sending');
    const next = getPathname({ href: '/mot-de-passe', locale });
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    });
    setState(error ? 'error' : 'sent');
  }

  return (
    <>
      <p>{hasPassword ? t('passwordSet') : t('passwordNone')}</p>
      <button
        type="button"
        className={hasPassword ? styles.ghost : styles.primary}
        disabled={state === 'sending' || state === 'sent'}
        onClick={send}
      >
        {hasPassword ? t('passwordChange') : t('passwordAdd')}
      </button>
      {state === 'sent' ? (
        <p role="status" className={styles.ok}>
          {t('passwordSent', { email })}
        </p>
      ) : null}
      {state === 'error' ? (
        <p role="alert" className={styles.err}>
          {t('error')}
        </p>
      ) : null}
    </>
  );
}
