import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { getPathname } from '@/i18n/navigation';
import { buildPasswordReset } from '@/lib/email/verification';
import { sendEmail } from '@/lib/email/send';
import { rateLimit, rateLimitKey, sameOrigin } from '@/lib/rate-limit';
import { findUserByEmail } from '@/lib/signup/code';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const body = z.object({
  email: z.email().max(320),
  locale: z.enum(['fr', 'en', 'es']),
});

/**
 * Mot de passe oublié : génère le lien de récupération côté serveur (sans que Supabase envoie d'e-mail)
 * et l'envoie par Resend, expéditeur Fuseo. Le lien passe par /auth/confirm (vérification du jeton côté serveur)
 * puis ouvre la page du site où l'on choisit le nouveau mot de passe.
 * Réponse identique que l'adresse ait un compte ou non.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  const { locale } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  if (
    !(await rateLimit(req, 'forgot', 10, 3600)) ||
    !(await rateLimitKey('forgot-email', email, 3, 3600))
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const db = createSupabaseAdminClient();
  const user = await findUserByEmail(db, email);
  // Pas de compte, ou inscription jamais validée (elle passe par le code à 8 chiffres) : rien à envoyer.
  if (!user?.confirmed) return NextResponse.json({ ok: true });

  const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email });
  const token = data?.properties?.hashed_token;
  if (error || !token) return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const next = getPathname({ href: '/mot-de-passe', locale });
  const url = new URL('/auth/confirm', env.NEXT_PUBLIC_SITE_URL);
  url.searchParams.set('token_hash', token);
  url.searchParams.set('type', 'recovery');
  url.searchParams.set('next', next);

  const mail = buildPasswordReset(locale, email, url.toString());
  const sent = await sendEmail({ to: email, ...mail });
  if (!sent.ok) return NextResponse.json({ error: 'email_failed' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
