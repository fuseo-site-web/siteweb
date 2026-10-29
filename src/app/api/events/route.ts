import { NextResponse } from 'next/server';
import { env } from '@/env';
import { batchSchema } from '@/lib/analytics/events';
import {
  classifyOrigin,
  countryOf,
  isBot,
  localeOfPath,
  parseDevice,
} from '@/lib/analytics/source';
import { CONSENT_COOKIE, parseConsent, readCookie } from '@/lib/consent/consent';
import { rateLimit } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Statistiques d'audience internes : pages vues et clics, uniquement si le visiteur a accepté la mesure
 * d'audience (le cookie de consentement est relu ici, côté serveur). Aucune IP, aucun compte, aucune donnée de santé.
 */
export async function POST(req: Request) {
  const site = new URL(env.NEXT_PUBLIC_SITE_URL);
  const origin = req.headers.get('origin');
  if (origin && origin !== site.origin && origin !== `${site.protocol}//www.${site.hostname}`) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const ua = req.headers.get('user-agent') ?? '';
  if (isBot(ua)) return new NextResponse(null, { status: 204 });

  const parsed = batchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 422 });
  const { vid, sid, events } = parsed.data;

  // Sans accord « mesure d'audience » valide pour ce visiteur : rien n'est enregistré.
  const consent = parseConsent(readCookie(req.headers.get('cookie') ?? '', CONSENT_COOKIE));
  if (!consent?.analytics || consent.id !== vid) return new NextResponse(null, { status: 204 });

  if (!(await rateLimit(req, 'events', 120, 60))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 });

  const { device, browser } = parseDevice(ua);
  const country = countryOf(req.headers);

  const rows = events.map((e) => {
    const from = e.entry
      ? classifyOrigin({ referrer: e.ref, utm: e.utm, ownHost: site.hostname })
      : null;
    return {
      visitor_id: vid,
      session_id: sid,
      name: e.name,
      path: e.path.split(/[?#]/)[0] ?? '/',
      locale: localeOfPath(e.path),
      is_entry: !!e.entry,
      referrer_host: from?.referrerHost ?? null,
      channel: from?.channel ?? null,
      source: from?.source ?? null,
      utm_source: e.entry ? (e.utm?.source ?? null) : null,
      utm_medium: e.entry ? (e.utm?.medium ?? null) : null,
      utm_campaign: e.entry ? (e.utm?.campaign ?? null) : null,
      country,
      device,
      browser,
      label: e.name === 'click' ? (e.label ?? null) : null,
      target: e.name === 'click' ? (e.target ?? null) : null,
      consent_version: consent.v,
    };
  });

  const { error } = await createSupabaseAdminClient().from('events').insert(rows);
  if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  return new NextResponse(null, { status: 204 });
}
