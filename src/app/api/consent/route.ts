import { NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/env';
import { rateLimit } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const body = z.object({
  id: z.uuid(),
  analytics: z.boolean(),
  version: z.string().min(1).max(32),
  source: z.enum(['banner', 'footer']),
});

/**
 * Preuve du choix sur les cookies (art. 7 RGPD) : identifiant aléatoire, choix, version, date.
 * Ni adresse IP ni compte : aucun lien possible avec les données de santé.
 */
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (
    origin &&
    origin !== new URL(env.NEXT_PUBLIC_SITE_URL).origin &&
    !origin.startsWith('http://localhost')
  ) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!(await rateLimit(req, 'consent', 20, 3600))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  // Sans clé service role (développement local), il n'y a rien à enregistrer : la mesure reste décidée par le cookie.
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 });

  const { error } = await createSupabaseAdminClient()
    .from('consent_logs')
    .insert({
      anon_id: parsed.data.id,
      choices: { necessary: true, analytics: parsed.data.analytics },
      policy_version: parsed.data.version,
      source: parsed.data.source,
    });
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  return new NextResponse(null, { status: 204 });
}
