import 'server-only';
import { env } from '@/env';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** E-mails commerciaux : en-têtes de désinscription en un clic (RFC 8058), exigés par Gmail et Yahoo. */
  unsubscribeUrl?: string;
  /** Adresse à laquelle part la réponse (ex. le visiteur d'un formulaire de contact). */
  replyTo?: string;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

/** Envoi par Resend (région UE). Retourne l'identifiant du message ou une erreur lisible, sans jamais exposer la clé. */
export async function sendEmail(mail: OutgoingEmail): Promise<SendResult> {
  if (!env.RESEND_API_KEY)
    return { ok: false, error: "La clé d'envoi (Resend) n'est pas configurée." };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? 'Fuseo <contact@fuseo.net>',
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
        ...(mail.unsubscribeUrl
          ? {
              headers: {
                'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }
          : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await r.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (r.ok && body.id) return { ok: true, id: body.id };
    return { ok: false, error: body.message ?? `Refus du service d'envoi (${r.status}).` };
  } catch {
    return { ok: false, error: "Le service d'envoi ne répond pas." };
  }
}
