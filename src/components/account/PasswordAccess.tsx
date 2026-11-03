'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import planner from '@/components/planner/Planner.module.css';
import { getPathname } from '@/i18n/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import styles from './Account.module.css';

type State =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'mismatch'
  | 'weak'
  | 'same'
  | 'code'
  | 'codeBad'
  | 'linkSent'
  | 'wait'
  | 'error';

/**
 * Ajout ou modification du mot de passe directement depuis l'espace (session déjà ouverte, par Google ou
 * par e-mail). Si le projet exige une confirmation récente, Supabase envoie un code par e-mail à saisir ici.
 * Le lien par e-mail reste proposé en secours.
 */
export function PasswordAccess({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const uid = useId();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [needCode, setNeedCode] = useState(false);
  const [show, setShow] = useState(false);
  const [state, setState] = useState<State>('idle');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setState('weak');
    if (password !== confirm) return setState('mismatch');
    setState('saving');
    const supabase = createSupabaseBrowserClient();
    // `has_password` (métadonnée d'affichage) : un compte Google qui ajoute un mot de passe reste « google » côté fournisseurs.
    const { error } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
      ...(needCode && code.trim() ? { nonce: code.trim() } : {}),
    });
    if (!error) {
      setState('saved');
      setPassword('');
      setConfirm('');
      setCode('');
      setNeedCode(false);
      return router.refresh();
    }
    const c = error.code ?? '';
    if (c === 'reauthentication_needed' || c === 'reauth_nonce_missing') {
      const r = await supabase.auth.reauthenticate();
      if (r.error) return setState(r.error.status === 429 ? 'wait' : 'error');
      setNeedCode(true);
      return setState('code');
    }
    if (c === 'reauthentication_not_valid' || c === 'otp_expired') return setState('codeBad');
    if (c === 'weak_password') return setState('weak');
    if (c === 'same_password') return setState('same');
    setState('error');
  }

  async function sendLink() {
    setState('saving');
    const next = getPathname({ href: '/mot-de-passe', locale });
    const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    });
    // Supabase limite les envois rapprochés (429 « over_email_send_rate_limit ») : un e-mail est déjà parti.
    if (error)
      return setState(
        error.status === 429 || /rate_limit/.test(error.code ?? '') ? 'wait' : 'error',
      );
    setState('linkSent');
  }

  const status: Partial<Record<State, string>> = {
    saved: t('passwordSaved', { email }),
    code: t('passwordCodeSent', { email }),
    linkSent: t('passwordSent', { email }),
    wait: t('passwordWait', { email }),
  };
  const alert: Partial<Record<State, string>> = {
    mismatch: t('passwordMismatch'),
    weak: t('passwordWeak'),
    same: t('passwordSame'),
    codeBad: t('passwordCodeBad'),
    error: t('error'),
  };
  const type = show ? 'text' : 'password';

  return (
    <>
      <p>{hasPassword ? t('passwordSet') : t('passwordNone')}</p>
      <form onSubmit={save} className={styles.pwForm} noValidate>
        {/* Aide les gestionnaires de mots de passe à associer le mot de passe au bon compte. */}
        <input type="email" value={email} autoComplete="username" readOnly hidden />
        <div className={planner.field}>
          <label htmlFor={`${uid}-new`}>{t('passwordNew')}</label>
          <input
            id={`${uid}-new`}
            type={type}
            autoComplete="new-password"
            minLength={10}
            required
            aria-describedby={`${uid}-hint`}
            aria-invalid={state === 'weak' || undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <small id={`${uid}-hint`} className={styles.hint}>
            {t('passwordHint')}
          </small>
        </div>
        <div className={planner.field}>
          <label htmlFor={`${uid}-confirm`}>{t('passwordConfirm')}</label>
          <input
            id={`${uid}-confirm`}
            type={type}
            autoComplete="new-password"
            required
            aria-invalid={state === 'mismatch' || undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {needCode ? (
          <div className={planner.field}>
            <label htmlFor={`${uid}-code`}>{t('passwordCode')}</label>
            <input
              id={`${uid}-code`}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              aria-invalid={state === 'codeBad' || undefined}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        ) : null}
        <label className={styles.consent}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <span>{t('passwordShow')}</span>
        </label>
        <div className={styles.actions}>
          <button
            type="submit"
            className={hasPassword ? styles.ghost : styles.primary}
            disabled={state === 'saving'}
          >
            {hasPassword ? t('passwordChange') : t('passwordAdd')}
          </button>
          <button
            type="button"
            className={styles.link2}
            disabled={state === 'saving'}
            onClick={sendLink}
          >
            {t('passwordByEmail')}
          </button>
        </div>
      </form>
      {status[state] ? (
        <p role="status" className={styles.ok}>
          {status[state]}
        </p>
      ) : null}
      {alert[state] ? (
        <p role="alert" className={styles.err}>
          {alert[state]}
        </p>
      ) : null}
    </>
  );
}
