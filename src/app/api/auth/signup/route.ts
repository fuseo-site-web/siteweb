import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { findUserByEmail, issueSignupCode, sendAlreadyRegistered } from '@/lib/signup/code';
import { rateLimit, rateLimitKey, sameOrigin } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const body = z.object({
  email: z.email().max(320),
  password: z.string().min(10).max(72),
  locale: z.enum(['fr', 'en', 'es']),
});

/**
 * Inscription : crée le compte NON confirmé, puis envoie par Resend (expéditeur Fuseo) un code à 8 chiffres.
 * Le compte ne devient utilisable qu'après saisie du code (voir /api/auth/verify).
 * La réponse est la même que l'adresse soit nouvelle ou déjà inscrite (pas de fuite sur l'existence d'un compte).
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const weak = parsed.error.issues.some((i) => i.path[0] === 'password');
    return NextResponse.json({ error: weak ? 'weak_password' : 'invalid_input' }, { status: 422 });
  }
  const { password, locale } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  if (
    !(await rateLimit(req, 'signup', 10, 3600)) ||
    !(await rateLimitKey('signup-email', email, 5, 3600))
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const db = createSupabaseAdminClient();
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { locale },
  });

  let userId = created.data.user?.id;
  if (!userId) {
    if (created.error?.code === 'weak_password')
      return NextResponse.json({ error: 'weak_password' }, { status: 422 });
    const existing = await findUserByEmail(db, email);
    if (!existing) {
      console.error('[signup] création impossible :', created.error?.code, created.error?.message);
      return NextResponse.json({ error: 'unavailable' }, { status: 503 });
    }
    if (existing.confirmed) {
      await sendAlreadyRegistered(email, locale);
      return NextResponse.json({ ok: true });
    }
    // Inscription jamais validée (code perdu ou expiré) : on renvoie un code. Le mot de passe saisi
    // est appliqué à la validation du code (voir /api/auth/verify), pas ici.
    userId = existing.id;
  }

  const sent = await issueSignupCode(db, { id: userId, email }, locale);
  if (!sent.ok) {
    console.error('[signup] envoi du code impossible');
    return NextResponse.json({ error: 'email_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
