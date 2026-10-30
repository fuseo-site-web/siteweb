'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, getPathname } from '@/i18n/navigation';
import type { routing } from '@/i18n/routing';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import styles from './Auth.module.css';

type Mode = 'login' | 'signup' | 'forgot';
type State = 'idle' | 'sending' | 'sent' | 'signupSent' | 'resetSent' | 'bad' | 'weak' | 'error';

export function LoginForm({
  next,
  initialMode = 'login',
}: {
  next?: string;
  initialMode?: 'login' | 'signup';
}) {
  const t = useTranslations('auth');
  const footer = useTranslations('footer');
  const locale = useLocale() as (typeof routing.locales)[number];
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<State>('idle');

  // Page de destination après connexion : l'espace compte (ou la page d'origine si elle est locale).
  const target =
    next && next.startsWith('/') && !next.startsWith('//')
      ? next
      : getPathname({ href: '/compte', locale });
  const redirectTo = (to = target) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;
  // Liens des e-mails : /auth/confirm vérifie le jeton côté serveur (marche depuis n'importe quel appareil).
  const emailRedirect = (to = target) =>
    `${window.location.origin}/auth/confirm?next=${encodeURIComponent(to)}`;
  const switchMode = (m: Mode) => {
    setMode(m);
    setState('idle');
    setPassword('');
  };

  async function google() {
    setState('idle');
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo() },
    });
    if (error) setState('error');
  }

  async function magicLink() {
    if (!email.trim()) return;
    setState('sending');
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: emailRedirect(), shouldCreateUser: true, data: { locale } },
    });
    setState(error ? 'error' : 'sent');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();
    const mail = email.trim();
    if (mode === 'forgot') {
      setState('sending');
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: emailRedirect(getPathname({ href: '/mot-de-passe', locale })),
      });
      return setState(error ? 'error' : 'resetSent');
    }
    if (mode === 'signup') {
      if (password.length < 10) return setState('weak');
      setState('sending');
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: { emailRedirectTo: emailRedirect(), data: { locale } },
      });
      if (error) return setState(error.code === 'weak_password' ? 'weak' : 'error');
      if (data.session) return void window.location.assign(target);
      return setState('signupSent');
    }
    setState('sending');
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
    if (error) return setState(error.code === 'invalid_credentials' ? 'bad' : 'error');
    window.location.assign(target);
  }

  const message: Partial<Record<State, string>> = {
    sent: t('sent', { email }),
    signupSent: t('signupSent', { email }),
    resetSent: t('resetSent', { email }),
  };
  const errorText: Partial<Record<State, string>> = {
    bad: t('badCreds'),
    weak: t('weak'),
    error: t('error'),
  };

  return (
    <div className={styles.card}>
      {mode !== 'forgot' ? (
        <>
          <div role="tablist" aria-label={t('title')} className={styles.tabs}>
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                id={`tab-${m}`}
                aria-selected={mode === m}
                aria-controls="auth-panel"
                className={styles.tab}
                onClick={() => switchMode(m)}
              >
                {m === 'login' ? t('tabLogin') : t('tabSignup')}
              </button>
            ))}
          </div>

          <button type="button" className={styles.google} onClick={google}>
            <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.8-2.1 5.2-4.5 6.8l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.8z"
              />
              <path
                fill="#FBBC05"
                d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
              />
            </svg>
            {t('google')}
          </button>

          <p className={styles.or}>
            <span>{t('or')}</span>
          </p>
        </>
      ) : null}

      <form
        onSubmit={submit}
        className={styles.form}
        id="auth-panel"
        role={mode === 'forgot' ? undefined : 'tabpanel'}
        aria-labelledby={mode === 'forgot' ? undefined : `tab-${mode}`}
      >
        {mode === 'forgot' ? <p className={styles.intro}>{t('resetIntro')}</p> : null}
        <label htmlFor="login-email">{t('email')}</label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== 'forgot' ? (
          <>
            <label htmlFor="login-password">{t('password')}</label>
            <input
              id="login-password"
              type="password"
              required
              minLength={mode === 'signup' ? 10 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              aria-describedby={mode === 'signup' ? 'login-password-hint' : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === 'signup' ? (
              <span id="login-password-hint" className={styles.hint}>
                {t('passwordHint')}
              </span>
            ) : null}
          </>
        ) : null}
        <button type="submit" className={styles.send} disabled={state === 'sending'}>
          {state === 'sending'
            ? t('sending')
            : mode === 'login'
              ? t('signIn')
              : mode === 'signup'
                ? t('signUp')
                : t('reset')}
        </button>
      </form>

      <div className={styles.links}>
        {mode === 'login' ? (
          <>
            <button type="button" className={styles.linkBtn} onClick={() => switchMode('forgot')}>
              {t('forgot')}
            </button>
            <button type="button" className={styles.linkBtn} onClick={() => void magicLink()}>
              {t('send')}
            </button>
          </>
        ) : null}
        {mode === 'forgot' ? (
          <button type="button" className={styles.linkBtn} onClick={() => switchMode('login')}>
            {t('back')}
          </button>
        ) : null}
      </div>

      {message[state] ? (
        <p role="status" className={styles.ok}>
          {message[state]}
        </p>
      ) : null}
      {errorText[state] ? (
        <p role="alert" className={styles.err}>
          {errorText[state]}
        </p>
      ) : null}

      <p className={styles.legal}>
        {t('legal')} <Link href="/cgu">{footer('cgu')}</Link> {t('and')}{' '}
        <Link href="/confidentialite">{footer('privacy')}</Link>.
      </p>
    </div>
  );
}
