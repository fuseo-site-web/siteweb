'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logAdmin, requireAdmin } from '@/lib/admin/access';
import { buildSupportReply } from '@/lib/email/support';
import { sendEmail } from '@/lib/email/send';
import type { SupportReason } from '@/lib/support/reasons';
import { asLang } from '@/lib/support/server';

const idSchema = z.uuid();
const bodySchema = z.string().trim().min(1).max(5000);

async function ticketInfo(id: string) {
  const { db } = await requireAdmin();
  const { data } = await db
    .from('support_tickets')
    .select('id, ref, reason, email, name, locale')
    .eq('id', id)
    .maybeSingle();
  return data
    ? {
        id: data.id,
        ref: data.ref,
        reason: data.reason as SupportReason,
        email: data.email,
        name: data.name,
        locale: asLang(data.locale),
      }
    : null;
}

/** Aperçu de l'e-mail de réponse, exactement comme le client le recevra. */
export async function previewSupportReply(ticketId: string, body: string) {
  if (!idSchema.safeParse(ticketId).success || !bodySchema.safeParse(body).success) return null;
  const t = await ticketInfo(ticketId);
  if (!t) return null;
  const mail = buildSupportReply(t, body.trim());
  return { subject: mail.subject, html: mail.html, to: t.email };
}

/** Envoie la réponse par e-mail (charte Fuseo) et l'ajoute à la conversation. */
export async function sendSupportReply(
  ticketId: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user, db } = await requireAdmin();
  if (!idSchema.safeParse(ticketId).success || !bodySchema.safeParse(body).success)
    return { ok: false, error: 'Message vide ou trop long.' };
  const t = await ticketInfo(ticketId);
  if (!t) return { ok: false, error: 'Dossier introuvable.' };
  const mail = buildSupportReply(t, body.trim());
  const sent = await sendEmail({
    to: t.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  if (!sent.ok) return { ok: false, error: `E-mail non envoyé : ${sent.error}` };
  await db.from('support_messages').insert({
    ticket_id: t.id,
    author: 'admin',
    author_id: user.id,
    body: body.trim(),
    email_id: sent.id,
  });
  await db
    .from('support_tickets')
    .update({
      status: 'answered',
      unread_admin: false,
      unread_user: true,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', t.id);
  await logAdmin(user.id, 'support.reply', t.ref);
  revalidatePath('/admin/support');
  return { ok: true };
}

/** Change l'état d'un dossier (ouvert, répondu, clos) ; ouvrir un dossier le marque comme lu. */
export async function setSupportStatus(
  ticketId: string,
  status: 'open' | 'answered' | 'closed' | 'read',
) {
  const { user, db } = await requireAdmin();
  if (!idSchema.safeParse(ticketId).success) return { ok: false };
  const patch = status === 'read' ? { unread_admin: false } : { status, unread_admin: false };
  await db.from('support_tickets').update(patch).eq('id', ticketId);
  if (status !== 'read') await logAdmin(user.id, 'support.status', ticketId, { status });
  revalidatePath('/admin/support');
  return { ok: true };
}
