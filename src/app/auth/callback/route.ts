import { NextResponse } from 'next/server';
import { pathAfterSignIn, safeNext as toSafeNext } from '@/lib/onboarding';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Retour de Google / du lien e-mail : échange le code contre une session (cookies httpOnly) puis redirige. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const safeNext = toSafeNext(url.searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Première connexion : l'écran de bienvenue demande d'abord les informations du compte.
      const { data } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, birth_date, country, home_airport')
        .maybeSingle();
      return NextResponse.redirect(new URL(pathAfterSignIn(data, safeNext), url.origin));
    }
  }
  return NextResponse.redirect(new URL('/connexion?error=1', url.origin));
}
