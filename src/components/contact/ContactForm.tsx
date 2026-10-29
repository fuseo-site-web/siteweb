'use client';

import { CalendarClock, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import styles from './Contact.module.css';

type Kind = 'contact' | 'rdv' | 'pro';

export function ContactForm({ initialKind = 'contact' }: { initialKind?: Kind }) {
  const t = useTranslations('contact');
  const locale = useLocale();
  const uid = useId();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'invalid' | 'limit'>(
    'idle',
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState('sending');
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          name: f.get('name'),
          email: f.get('email'),
          subject: f.get('subject'),
          message: f.get('message'),
          phone: f.get('phone') || undefined,
          slot: f.get('slot') || undefined,
          website: f.get('website') || undefined,
          locale,
          consent: f.get('consent') === 'on',
        }),
      });
      setState(
        r.status === 204
          ? 'sent'
          : r.status === 422
            ? 'invalid'
            : r.status === 429
              ? 'limit'
              : 'error',
      );
      if (r.status === 204) e.currentTarget.reset();
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className={styles.card} role="status">
        <h2>{t('thanksTitle')}</h2>
        <p>{t('thanksText')}</p>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={submit} noValidate={false}>
      <fieldset className={styles.kinds}>
        <legend>{t('kindLabel')}</legend>
        {(['contact', 'rdv', 'pro'] as const).map((k) => (
          <label key={k} className={styles.kind} data-on={kind === k}>
            <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />
            {t(`kind_${k}`)}
          </label>
        ))}
      </fieldset>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={`${uid}-n`}>{t('name')}</label>
          <input
            id={`${uid}-n`}
            name="name"
            required
            minLength={2}
            maxLength={200}
            autoComplete="name"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${uid}-e`}>{t('email')}</label>
          <input
            id={`${uid}-e`}
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${uid}-p`}>{t('phone')}</label>
          <input id={`${uid}-p`} name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </div>
        {kind === 'rdv' ? (
          <div className={styles.field}>
            <label htmlFor={`${uid}-s`}>
              <CalendarClock size={14} aria-hidden="true" /> {t('slot')}
            </label>
            <input id={`${uid}-s`} name="slot" maxLength={200} placeholder={t('slotPh')} />
          </div>
        ) : null}
        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor={`${uid}-su`}>{t('subject')}</label>
          <input id={`${uid}-su`} name="subject" required minLength={3} maxLength={200} />
        </div>
        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor={`${uid}-m`}>{t('message')}</label>
          <textarea
            id={`${uid}-m`}
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={6}
          />
          <small>{t('noHealth')}</small>
        </div>
        <div className={styles.trap} aria-hidden="true">
          <label>
            Site web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </div>

      <label className={styles.consent}>
        <input type="checkbox" name="consent" required />
        <span>{t('consent')}</span>
      </label>

      <div className={styles.actions}>
        <button type="submit" className={styles.send} disabled={state === 'sending'}>
          <Send size={17} aria-hidden="true" /> {state === 'sending' ? t('sending') : t('send')}
        </button>
        <span role="alert" className={styles.err}>
          {state === 'invalid'
            ? t('invalid')
            : state === 'limit'
              ? t('limit')
              : state === 'error'
                ? t('error')
                : ''}
        </span>
      </div>
    </form>
  );
}
