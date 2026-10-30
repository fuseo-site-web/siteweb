import { createServerClient } from '@supabase/ssr';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { getPathname } from './i18n/navigation';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);
const localeOf = (pathname: string) =>
  routing.locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ??
  routing.defaultLocale;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = localeOf(pathname);
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));

  // Garde légère : l'espace compte exige une session (la vérification complète se fait côté serveur).
  if (
    !hasSession &&
    routing.locales.some((l) => pathname === getPathname({ href: '/compte', locale: l }))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = getPathname({ href: '/connexion', locale });
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // L'espace admin n'a pas de langue : on ne fait que rafraîchir la session.
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const response = isAdmin ? NextResponse.next({ request }) : intl(request);
  if (hasSession) {
    // Rafraîchit la session (jeton Auth) et reporte les cookies mis à jour sur la réponse.
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) =>
            list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
        },
      },
    );
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|auth|mcp|_next|_vercel|.*\\..*).*)'],
};
