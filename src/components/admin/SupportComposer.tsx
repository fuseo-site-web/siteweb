'use client';

import { Eye, Send } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import {
  previewSupportReply,
  sendSupportReply,
  setSupportStatus,
} from '@/app/admin/actions-support';
import styles from './Admin.module.css';

/** Zone de réponse : rédiger, voir l'aperçu de l'e-mail (charte Fuseo), envoyer. */
export function SupportComposer({ id }: { id: string }) {
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<{ subject: string; html: string; to: string } | null>(
    null,
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className={styles.composer}>
      <label htmlFor={`reply-${id}`} className={styles.srOnly}>
        Votre réponse
      </label>
      <textarea
        id={`reply-${id}`}
        value={body}
        maxLength={5000}
        placeholder="Écrivez votre réponse au client…"
        onChange={(e) => {
          setBody(e.target.value);
          setPreview(null);
          setMsg(null);
        }}
      />
      <div className={styles.composerActions}>
        <button
          type="button"
          className={styles.btnGhost}
          disabled={!body.trim() || pending}
          onClick={() =>
            start(async () => {
              setPreview(await previewSupportReply(id, body));
            })
          }
        >
          <Eye size={16} aria-hidden="true" /> Aperçu de l&apos;e-mail
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={!body.trim() || pending}
          onClick={() =>
            start(async () => {
              const r = await sendSupportReply(id, body);
              if (r.ok) {
                setBody('');
                setPreview(null);
                setMsg({
                  ok: true,
                  text: 'Réponse envoyée par e-mail et ajoutée à la conversation.',
                });
              } else setMsg({ ok: false, text: r.error });
            })
          }
        >
          <Send size={16} aria-hidden="true" /> {pending ? 'Envoi…' : 'Envoyer la réponse'}
        </button>
      </div>
      {msg ? (
        <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? styles.okText : styles.roleError}>
          {msg.text}
        </p>
      ) : null}
      {preview ? (
        <div className={styles.emailPreview}>
          <p>
            <b>À :</b> {preview.to} · <b>Objet :</b> {preview.subject}
          </p>
          <iframe title="Aperçu de l'e-mail" srcDoc={preview.html} sandbox="" />
        </div>
      ) : null}
    </div>
  );
}

/** État du dossier ; l'ouvrir le marque comme lu. */
export function SupportStatus({
  id,
  status,
  unread,
}: {
  id: string;
  status: string;
  unread: boolean;
}) {
  const [pending, start] = useTransition();
  useEffect(() => {
    if (unread) void setSupportStatus(id, 'read');
  }, [id, unread]);
  return (
    <div className={styles.composerActions}>
      {status === 'closed' ? (
        <button
          type="button"
          className={styles.btnGhost}
          disabled={pending}
          onClick={() => start(async () => void (await setSupportStatus(id, 'open')))}
        >
          Rouvrir
        </button>
      ) : (
        <button
          type="button"
          className={styles.btnGhost}
          disabled={pending}
          onClick={() => start(async () => void (await setSupportStatus(id, 'closed')))}
        >
          Clore le dossier
        </button>
      )}
    </div>
  );
}
