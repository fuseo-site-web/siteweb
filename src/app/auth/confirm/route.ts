import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const TYPES: EmailOtpType[] = [
  'email',
  'signup',
  'magiclink',
  'recovery',
  'email_change',
  'invite',
];

/**
 * Lien des e-mails (confirmation, lien magique, mot de passe oublié) : vérifie le jeton côté serveur.
 * Contrairement au flux par code (PKCE), il fonctionne même si l'e-mail est ouvert sur un autre appareil.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') ?? '/';
  // Redirection relative uniquement (pas de redirection ouverte).
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
  }
  return NextResponse.redirect(new URL('/connexion?error=1', url.origin));
}
