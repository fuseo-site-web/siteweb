import 'server-only';
import { randomBytes } from 'node:crypto';
import { ADMIN_EMAIL } from '@/lib/admin/access';
import { buildSupportAck, buildSupportAdmin } from '@/lib/email/support';
import type { Lang } from '@/lib/email/layout';
import { sendEmail } from '@/lib/email/send';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { newSupportRef, type SupportReason } from './reasons';

const LANGS: Lang[] = ['fr', 'en', 'es'];
export const asLang = (v: unknown): Lang => (LANGS.includes(v as Lang) ? (v as Lang) : 'fr');

/** Langue de communication du client : celle de son profil, sinon celle de la page. */
export async function preferredLang(userId: string, fallback: Lang): Promise<Lang> {
  const { data } = await createSupabaseAdminClient()
    .from('user_profiles')
    .select('preferred_locale')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.preferred_locale ? asLang(data.preferred_locale) : fallback;
}

/** Crée un dossier (numéro de référence unique), son premier message, et envoie les deux e-mails. */
export async function openTicket(input: {
  userId: string;
  email: string;
  name: string | null;
  locale: Lang;
  reason: SupportReason;
  message: string;
}) {
  const db = createSupabaseAdminClient();
  let ticket: { id: string; ref: string } | null = null;
  for (let i = 0; i < 5 && !ticket; i++) {
    const { data } = await db
      .from('support_tickets')
      .insert({
        ref: newSupportRef((n) => randomBytes(n)),
        user_id: input.userId,
        email: input.email,
        name: input.name,
        locale: input.locale,
        reason: input.reason,
      })
      .select('id, ref')
      .single();
    ticket = data;
  }
  if (!ticket) throw new Error('ticket');
  await db.from('support_messages').insert({
    ticket_id: ticket.id,
    author: 'user',
    author_id: input.userId,
    body: input.message,
  });
  const info = { ...input, ref: ticket.ref };
  const ack = buildSupportAck(info, input.message);
  const admin = buildSupportAdmin(info, input.message, true);
  await Promise.allSettled([
    sendEmail({ to: input.email, subject: ack.subject, html: ack.html, text: ack.text }),
    sendEmail({
      to: ADMIN_EMAIL,
      subject: admin.subject,
      html: admin.html,
      text: admin.text,
      replyTo: input.email,
    }),
  ]);
  return ticket;
}
