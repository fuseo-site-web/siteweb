import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { ADMIN_EMAIL } from '@/lib/admin/access';
import { buildContactAck, buildContactAdmin } from '@/lib/email/contact';
import { sendEmail } from '@/lib/email/send';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const body = z.object({
  kind: z.enum(['contact', 'rdv', 'pro']),
  name: z.string().trim().min(2).max(200),
  email: z.email().max(320),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(5000),
  phone: z.string().trim().max(40).optional(),
  slot: z.string().trim().max(200).optional(),
  locale: z.enum(['fr', 'en', 'es']),
  consent: z.literal(true),
  /** Piège à robots : un humain ne remplit jamais ce champ caché. */
  website: z.string().max(0).optional(),
});

/** Formulaire de contact : question, demande de rendez-vous ou demande Fuseo Pro. Enregistré pour l'espace admin. */
export async function POST(req: Request) {
  const site = new URL(env.NEXT_PUBLIC_SITE_URL);
  const origin = req.headers.get('origin');
  if (
    origin &&
    origin !== site.origin &&
    origin !== `${site.protocol}//www.${site.hostname}` &&
    !origin.startsWith('http://localhost')
  ) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!(await rateLimit(req, 'contact', 5, 3600))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const v = parsed.data;
  const { error } = await createSupabaseAdminClient()
    .from('contact_messages')
    .insert({
      kind: v.kind,
      name: v.name,
      email: v.email,
      subject: v.subject,
      message: v.message,
      phone: v.phone || null,
      preferred_slot: v.kind === 'rdv' ? v.slot || null : null,
      locale: v.locale,
    });
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  // Notifications : le message est déjà enregistré, un échec d'envoi ne doit jamais faire échouer la demande.
  const input = {
    kind: v.kind,
    name: v.name,
    email: v.email,
    phone: v.phone,
    slot: v.slot,
    subject: v.subject,
    message: v.message,
    locale: v.locale,
  };
  const admin = buildContactAdmin(input, new Date());
  const jobs = [
    sendEmail({
      to: ADMIN_EMAIL,
      subject: admin.subject,
      html: admin.html,
      text: admin.text,
      replyTo: v.email,
    }),
  ];
  // Accusé de réception : 2 par jour et par adresse au maximum, pour ne pas servir à inonder la boîte de quelqu'un.
  if (await rateLimitKey('contact-ack', v.email, 2, 86_400)) {
    const ack = buildContactAck(input);
    jobs.push(sendEmail({ to: v.email, subject: ack.subject, html: ack.html, text: ack.text }));
  }
  await Promise.allSettled(jobs);
  return new NextResponse(null, { status: 204 });
}
