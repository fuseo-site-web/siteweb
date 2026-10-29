'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import styles from './Auth.module.css';

/** Atteint via le lien de réinitialisation : la session de récupération est déjà ouverte par /auth/callback. */
export function NewPasswordForm() {
  const t = useTranslations('auth');
  const [session, setSession] = useState<'loading' | 'yes' | 'no'>('loading');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'weak' | 'error'>('idle');

  useEffect(() => {
    void createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => setSession(data.user ? 'yes' : 'no'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setState('weak');
    setState('sending');
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    if (error) return setState(error.code === 'weak_password' ? 'weak' : 'error');
    setState('done');
    setTimeout(() => window.location.assign('/mon-compte'), 1200);
  }

  if (session === 'loading') return <div className={styles.card} aria-busy="true" />;
  if (session === 'no')
    return (
      <div className={styles.card}>
        <p role="alert" className={styles.err}>
          {t('resetExpired')}
        </p>
        <p className={styles.links}>
          <Link href="/connexion" className={styles.linkBtn}>
            {t('resetAgain')}
          </Link>
        </p>
      </div>
    );

  return (
    <div className={styles.card}>
      <form onSubmit={submit} className={styles.form}>
        <label htmlFor="new-password">{t('password')}</label>
        <input
          id="new-password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          aria-describedby="new-password-hint"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span id="new-password-hint" className={styles.hint}>
          {t('passwordHint')}
        </span>
        <button
          type="submit"
          className={styles.send}
          disabled={state === 'sending' || state === 'done'}
        >
          {t('resetSave')}
        </button>
      </form>
      {state === 'done' ? (
        <p role="status" className={styles.ok}>
          {t('resetDone')}
        </p>
      ) : null}
      {state === 'weak' || state === 'error' ? (
        <p role="alert" className={styles.err}>
          {state === 'weak' ? t('weak') : t('error')}
        </p>
      ) : null}
    </div>
  );
}
