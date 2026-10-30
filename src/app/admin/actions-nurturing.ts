'use server';

import { z } from 'zod';
import { env } from '@/env';
import { ADMIN_EMAIL, logAdmin, requireAdmin } from '@/lib/admin/access';
import { articlesFor } from '@/lib/email/articles';
import { buildNurturing, SEQUENCES } from '@/lib/email/nurturing';
import { sendEmail } from '@/lib/email/send';
import { unsubscribeUrl } from '@/lib/email/unsubscribe';

const schema = z.object({
  id: z.enum(SEQUENCES.map((s) => s.id) as [string, ...string[]]),
  lang: z.enum(['fr', 'en', 'es']),
});

/**
 * Envoie un exemple d'une séquence à l'adresse de l'administrateur, et seulement à elle.
 * Aucune route de cet espace n'envoie à un client : les envois automatiques ne sont pas activés.
 */
export async function sendNurturingTest(input: unknown): Promise<{ ok: boolean; message: string }> {
  const { user } = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Demande invalide.' };
  const { id, lang } = parsed.data as {
    id: (typeof SEQUENCES)[number]['id'];
    lang: 'fr' | 'en' | 'es';
  };
  const unsub = env.ADMIN_SESSION_SECRET
    ? unsubscribeUrl(
        env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, ''),
        ADMIN_EMAIL,
        env.ADMIN_SESSION_SECRET,
        lang,
      )
    : undefined;
  const mail = buildNurturing(id, lang, {
    firstName: 'Camille',
    email: ADMIN_EMAIL,
    articles: await articlesFor(id, lang),
    unsubscribeUrl: unsub,
  });
  const r = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[TEST] ${mail.subject}`,
    html: mail.html,
    text: mail.text,
    unsubscribeUrl: mail.kind === 'marketing' ? unsub : undefined,
  });
  await logAdmin(user.id, 'nurturing.test', `${id}:${lang}`, { ok: r.ok });
  return r.ok ? { ok: true, message: `Envoyé à ${ADMIN_EMAIL}.` } : { ok: false, message: r.error };
}
