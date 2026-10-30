'use client';

import { Send } from 'lucide-react';
import { useState, useTransition } from 'react';
import { sendNurturingTest } from '@/app/admin/actions-nurturing';
import styles from './Admin.module.css';
import { Info } from './Info';

export interface LabItem {
  id: string;
  name: string;
  trigger: string;
  audience: string;
  goal: string;
  kind: 'service' | 'marketing';
  subject: string;
  html: string;
}

/** Aperçu de chaque e-mail dans un cadre isolé, et envoi d'un exemple à l'adresse de l'administrateur uniquement. */
export function NurturingLab({
  items,
  lang,
  admin,
}: {
  items: LabItem[];
  lang: string;
  admin: string;
}) {
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const send = (id: string) => {
    setBusyId(id);
    start(async () => {
      const r = await sendNurturingTest({ id, lang });
      setMsg((m) => ({ ...m, [id]: { ok: r.ok, text: r.message } }));
      setBusyId(null);
    });
  };

  return (
    <div className={styles.stack}>
      {items.map((s) => (
        <article key={s.id} className={styles.card}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <h2 style={{ margin: 0 }}>{s.name}</h2>
            <span className={`${styles.pill} ${s.kind === 'marketing' ? styles.warn : styles.ok}`}>
              {s.kind === 'marketing'
                ? 'Commercial (désinscription)'
                : 'Service (compte ou voyage)'}
            </span>
            <Info
              title={s.kind === 'marketing' ? 'E-mail commercial' : 'E-mail de service'}
              example={
                s.kind === 'marketing'
                  ? 'Une relance ou une newsletter : le destinataire doit avoir accepté et pouvoir se désinscrire en un clic.'
                  : 'Un message de bienvenue ou un rappel de voyage : lié à l’usage du compte.'
              }
            >
              Un e-mail commercial a pour but de promouvoir ou d’entretenir la relation : la loi
              exige l’accord de la personne et un lien de désinscription. Un e-mail de service
              accompagne l’utilisation du compte ou d’un voyage.
            </Info>
          </div>
          <p style={{ margin: '0 0 4px', color: 'var(--muted)', fontSize: 14 }}>
            <b>Objectif :</b> {s.goal}
          </p>
          <p style={{ margin: '0 0 4px', color: 'var(--muted)', fontSize: 14 }}>
            <b>Quand :</b> {s.trigger}
          </p>
          <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
            <b>Pour qui :</b> {s.audience} · <b>Objet :</b> {s.subject}
          </p>
          <iframe
            title={`Aperçu : ${s.name}`}
            srcDoc={s.html}
            sandbox=""
            style={{
              width: '100%',
              height: 640,
              border: '1px solid var(--line)',
              borderRadius: 14,
              background: '#eef4f9',
            }}
          />
          <div className={styles.toolbar} style={{ marginTop: 12, alignItems: 'center' }}>
            <button
              type="button"
              className={styles.btn}
              disabled={pending}
              onClick={() => send(s.id)}
            >
              <Send size={16} aria-hidden="true" />{' '}
              {busyId === s.id ? 'Envoi…' : `Envoyer un test à ${admin}`}
            </button>
            {msg[s.id] ? (
              <span
                role={msg[s.id]!.ok ? 'status' : 'alert'}
                className={msg[s.id]!.ok ? undefined : styles.err}
                style={{ fontWeight: 700, color: msg[s.id]!.ok ? '#0f6b43' : undefined }}
              >
                {msg[s.id]!.text}
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
