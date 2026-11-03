'use client';

import { ArrowLeft, CheckCircle2, HelpCircle, Send, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { SUPPORT_REASONS, type SupportReason } from '@/lib/support/reasons';
import styles from './Support.module.css';

interface Msg {
  id: string;
  author: 'user' | 'admin';
  body: string;
  created_at: string;
}
interface Ticket {
  id: string;
  ref: string;
  reason: SupportReason;
  status: 'open' | 'answered' | 'closed';
  unread_user: boolean;
  last_message_at: string;
  support_messages: Msg[];
}

/**
 * Support pour les utilisateurs connectés : un bouton « ? » ouvre un panneau pour écrire à l'équipe
 * (motif + message → numéro de dossier) et suivre ses demandes comme une conversation.
 */
export function SupportWidget() {
  const t = useTranslations('support');
  const locale = useLocale();
  const uid = useId();
  const [logged, setLogged] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'new' | 'list'>('new');
  const [reason, setReason] = useState<SupportReason | null>(null);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error' | 'limit'>('idle');
  const [ref, setRef] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => setLogged(!!data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setLogged(!!session?.user));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const r = await fetch('/api/support', { cache: 'no-store' });
    if (r.ok) setTickets((await r.json()) as Ticket[]);
  }, []);

  useEffect(() => {
    if (!logged) return;
    const id = setTimeout(() => void load(), 0);
    return () => clearTimeout(id);
  }, [logged, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!logged) return null;
  const unread = tickets.filter((x) => x.unread_user).length;
  const ticket = tickets.find((x) => x.id === current) ?? null;

  async function send() {
    if (!reason || message.trim().length < 10) return;
    setState('sending');
    const r = await fetch('/api/support', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason, message: message.trim(), locale }),
    });
    if (!r.ok) return setState(r.status === 429 ? 'limit' : 'error');
    setRef(((await r.json()) as { ref: string }).ref);
    setState('idle');
    setMessage('');
    setReason(null);
    void load();
  }

  async function openTicket(x: Ticket) {
    setCurrent(x.id);
    if (x.unread_user) {
      await fetch('/api/support/reply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticketId: x.id, read: true }),
      });
      void load();
    }
  }

  async function sendReply() {
    if (!ticket || !reply.trim()) return;
    setState('sending');
    const r = await fetch('/api/support/reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id, message: reply.trim() }),
    });
    setState(r.ok ? 'idle' : r.status === 429 ? 'limit' : 'error');
    if (r.ok) {
      setReply('');
      void load();
    }
  }

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    );

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        aria-label={t('open')}
        title={t('open')}
        onClick={() => setOpen((o) => !o)}
      >
        <HelpCircle size={22} aria-hidden="true" />
        {unread ? <span className={styles.dot}>{unread}</span> : null}
      </button>
      {open ? (
        <div
          id={`${uid}-panel`}
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${uid}-title`}
          className={styles.panel}
        >
          <header className={styles.head}>
            <h2 id={`${uid}-title`}>{t('title')}</h2>
            <button
              type="button"
              className={styles.close}
              aria-label={t('close')}
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </button>
          </header>
          <div role="tablist" className={styles.tabs} aria-label={t('title')}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'new'}
              onClick={() => {
                setTab('new');
                setCurrent(null);
              }}
            >
              {t('tabNew')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'list'}
              onClick={() => {
                setTab('list');
                setRef(null);
              }}
            >
              {t('tabList')} {tickets.length ? `(${tickets.length})` : ''}
              {unread ? <i className={styles.inlineDot} aria-label={t('unread')} /> : null}
            </button>
          </div>

          <div className={styles.body}>
            {tab === 'new' ? (
              ref ? (
                <div className={styles.done} role="status">
                  <CheckCircle2 size={34} aria-hidden="true" />
                  <p>{t('sent')}</p>
                  <p className={styles.ref}>
                    {t('refLabel')} <b>{ref}</b>
                  </p>
                  <small>{t('sentNote')}</small>
                  <button type="button" className={styles.ghost} onClick={() => setRef(null)}>
                    {t('another')}
                  </button>
                </div>
              ) : (
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <fieldset>
                    <legend>{t('reasonLabel')}</legend>
                    <div className={styles.reasons}>
                      {SUPPORT_REASONS.map((r) => (
                        <label key={r} data-on={reason === r || undefined}>
                          <input
                            type="radio"
                            name={`${uid}-reason`}
                            value={r}
                            checked={reason === r}
                            onChange={() => setReason(r)}
                          />
                          {t(`reason.${r}`)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {reason === 'health' ? <p className={styles.note}>{t('healthNote')}</p> : null}
                  <label htmlFor={`${uid}-msg`}>{t('messageLabel')}</label>
                  <textarea
                    id={`${uid}-msg`}
                    value={message}
                    minLength={10}
                    maxLength={5000}
                    required
                    placeholder={t('messagePh')}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button
                    type="submit"
                    className={styles.primary}
                    disabled={!reason || message.trim().length < 10 || state === 'sending'}
                  >
                    <Send size={16} aria-hidden="true" />{' '}
                    {state === 'sending' ? t('sending') : t('send')}
                  </button>
                  {state === 'error' || state === 'limit' ? (
                    <p role="alert" className={styles.err}>
                      {state === 'limit' ? t('limit') : t('error')}
                    </p>
                  ) : null}
                </form>
              )
            ) : ticket ? (
              <div className={styles.thread}>
                <button type="button" className={styles.back} onClick={() => setCurrent(null)}>
                  <ArrowLeft size={16} aria-hidden="true" /> {t('back')}
                </button>
                <p className={styles.threadHead}>
                  <b>{ticket.ref}</b> · {t(`reason.${ticket.reason}`)} ·{' '}
                  {t(`status.${ticket.status}`)}
                </p>
                <ol className={styles.bubbles}>
                  {[...ticket.support_messages]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((m) => (
                      <li key={m.id} data-author={m.author}>
                        <p>{m.body}</p>
                        <small>
                          {m.author === 'admin' ? t('team') : t('you')} · {fmt(m.created_at)}
                        </small>
                      </li>
                    ))}
                </ol>
                {ticket.status === 'closed' ? (
                  <p className={styles.note}>{t('closed')}</p>
                ) : (
                  <form
                    className={styles.replyForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendReply();
                    }}
                  >
                    <label htmlFor={`${uid}-reply`} className={styles.srOnly}>
                      {t('replyLabel')}
                    </label>
                    <textarea
                      id={`${uid}-reply`}
                      value={reply}
                      maxLength={5000}
                      placeholder={t('replyLabel')}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <button
                      type="submit"
                      className={styles.primary}
                      disabled={!reply.trim() || state === 'sending'}
                      aria-label={t('send')}
                    >
                      <Send size={16} aria-hidden="true" />
                    </button>
                  </form>
                )}
              </div>
            ) : tickets.length ? (
              <ul className={styles.list}>
                {tickets.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => void openTicket(x)}>
                      <span>
                        <b>{x.ref}</b> · {t(`reason.${x.reason}`)}
                        {x.unread_user ? (
                          <i className={styles.inlineDot} aria-label={t('unread')} />
                        ) : null}
                      </span>
                      <small>
                        {t(`status.${x.status}`)} · {fmt(x.last_message_at)}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.note}>{t('empty')}</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
