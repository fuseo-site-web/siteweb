import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { findUserByEmail, issueSignupCode } from '@/lib/signup/code';
import { rateLimit, rateLimitKey, sameOrigin } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const body = z.object({
  email: z.email().max(320),
  locale: z.enum(['fr', 'en', 'es']),
});

/** Renvoie un nouveau code à une inscription en attente de validation. Réponse identique si l'adresse est inconnue. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  const email = parsed.data.email.trim().toLowerCase();

  if (
    !(await rateLimit(req, 'signup-resend', 10, 3600)) ||
    !(await rateLimitKey('signup-resend-email', email, 5, 3600))
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const db = createSupabaseAdminClient();
  const user = await findUserByEmail(db, email);
  if (user && !user.confirmed) {
    const sent = await issueSignupCode(db, { id: user.id, email }, parsed.data.locale);
    if (!sent.ok) return NextResponse.json({ error: 'email_failed' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
