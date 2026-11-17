import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { CODE_LENGTH, codeMatches, findUserByEmail } from '@/lib/signup/code';
import { pathAfterSignIn, safeNext } from '@/lib/onboarding';
import { rateLimit, rateLimitKey, sameOrigin } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const body = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(72),
  code: z.string().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`)),
  next: z.string().max(500).optional(),
});

/**
 * Valide le code à 8 chiffres : confirme l'adresse, puis ouvre la session (cookies httpOnly).
 * 5 essais par code ; au-delà (ou après 15 minutes) il faut en demander un nouveau.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_code' }, { status: 422 });
  const { password, code } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  if (
    !(await rateLimit(req, 'signup-verify', 30, 3600)) ||
    !(await rateLimitKey('signup-verify-email', email, 15, 3600))
  ) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const db = createSupabaseAdminClient();
  const user = await findUserByEmail(db, email);
  // Même réponse pour une adresse inconnue, déjà validée ou un code faux : rien à apprendre pour un tiers.
  const invalid = () => NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  if (!user || user.confirmed) return invalid();

  const { data: storedHash } = await db.rpc('signup_code_attempt', { p_user: user.id });
  if (!storedHash || !codeMatches(user.id, code, storedHash)) return invalid();

  const { error: confirmError } = await db.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });
  if (confirmError) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  await db.from('signup_verifications').delete().eq('user_id', user.id);

  // Ouverture de session : l'écran de bienvenue demande ensuite les informations du compte.
  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return NextResponse.json({ ok: true, signedIn: false });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, birth_date, country, home_airport')
    .maybeSingle();
  return NextResponse.json({
    ok: true,
    signedIn: true,
    redirect: pathAfterSignIn(profile, safeNext(parsed.data.next)),
  });
}
