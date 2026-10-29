'use client';

import { Mail, Phone } from 'lucide-react';
import { useState, useTransition } from 'react';
import { setMessageStatus } from '@/app/admin/actions-messages';
import styles from './Admin.module.css';

export interface MessageRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  kind: string;
  phone: string | null;
  preferred_slot: string | null;
  locale: string;
  created_at: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Nouvelle', cls: styles.bad ?? '' },
  open: { label: 'En cours', cls: styles.warn ?? '' },
  answered: { label: 'Répondue', cls: styles.ok ?? '' },
  closed: { label: 'Clôturée', cls: '' },
};
const KIND: Record<string, string> = { contact: 'Question', rdv: 'Rendez-vous', pro: 'Fuseo Pro' };
const when = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso));

/** Liste de demandes avec changement d'état en un clic et réponse par e-mail. */
export function MessageBoard({ rows, empty }: { rows: MessageRow[]; empty: string }) {
  const [list, setList] = useState(rows);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  const change = (id: string, status: string) =>
    start(async () => {
      const r = await setMessageStatus({ id, status });
      setError(!r.ok);
      if (r.ok) setList((l) => l.map((m) => (m.id === id ? { ...m, status } : m)));
    });

  if (!list.length) return <div className={styles.empty}>{empty}</div>;
  return (
    <div className={styles.stack}>
      {error ? (
        <p role="alert" className={styles.err}>
          Le changement d&apos;état a échoué. Réessayez.
        </p>
      ) : null}
      {list.map((m) => {
        const st = STATUS[m.status] ?? { label: m.status, cls: '' };
        return (
          <article key={m.id} className={styles.card}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span className={`${styles.pill} ${st.cls}`}>{st.label}</span>
              <span className={styles.pill}>{KIND[m.kind] ?? m.kind}</span>
              <b style={{ fontSize: '1.02rem' }}>{m.subject}</b>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 13 }}>
                {when(m.created_at)}
              </span>
            </div>
            <p style={{ margin: '10px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 18px',
                fontSize: 13.5,
                color: 'var(--muted)',
              }}
            >
              <span>
                <b style={{ color: 'var(--ink)' }}>{m.name}</b> · {m.email}
              </span>
              {m.phone ? (
                <span>
                  <Phone size={13} style={{ verticalAlign: -2 }} aria-hidden="true" /> {m.phone}
                </span>
              ) : null}
              {m.preferred_slot ? <span>Créneau souhaité : {m.preferred_slot}</span> : null}
            </div>
            <div className={styles.toolbar} style={{ marginTop: 12 }}>
              <a
                className={styles.btn}
                href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}
                onClick={() => m.status === 'new' && change(m.id, 'open')}
              >
                <Mail size={16} aria-hidden="true" /> Répondre
              </a>
              {(['open', 'answered', 'closed'] as const)
                .filter((s) => s !== m.status)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.btnGhost}
                    disabled={pending}
                    onClick={() => change(m.id, s)}
                  >
                    Marquer « {STATUS[s]?.label.toLowerCase()} »
                  </button>
                ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
