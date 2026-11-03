import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMIN_EMAIL } from '@/lib/admin/access';
import { getCurrentUser } from '@/lib/auth';
import { buildSupportAdmin } from '@/lib/email/support';
import { sendEmail } from '@/lib/email/send';
import { rateLimitKey, sameOrigin } from '@/lib/rate-limit';
import type { SupportReason } from '@/lib/support/reasons';
import { asLang } from '@/lib/support/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  ticketId: z.uuid(),
  message: z.string().trim().min(1).max(5000).optional(),
  /** true : le client a lu la réponse de l'équipe (pastille « non lu » retirée). */
  read: z.boolean().optional(),
});

/** Le client répond dans son dossier (ou le marque comme lu). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { user } = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 422 });
  const db = createSupabaseAdminClient();
  const { data: t } = await db
    .from('support_tickets')
    .select('id, ref, reason, email, name, locale, user_id')
    .eq('id', parsed.data.ticketId)
    .maybeSingle();
  if (!t || t.user_id !== user.id)
    return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (!parsed.data.message) {
    await db.from('support_tickets').update({ unread_user: false }).eq('id', t.id);
    return new NextResponse(null, { status: 204 });
  }
  if (!(await rateLimitKey('support-reply', user.id, 20, 3600)))
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  await db
    .from('support_messages')
    .insert({ ticket_id: t.id, author: 'user', author_id: user.id, body: parsed.data.message });
  await db
    .from('support_tickets')
    .update({
      status: 'open',
      unread_admin: true,
      unread_user: false,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', t.id);
  const mail = buildSupportAdmin(
    {
      ref: t.ref,
      reason: t.reason as SupportReason,
      email: t.email,
      name: t.name,
      locale: asLang(t.locale),
    },
    parsed.data.message,
    false,
  );
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    replyTo: t.email,
  });
  return new NextResponse(null, { status: 204 });
}
