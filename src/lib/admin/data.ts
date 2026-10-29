import 'server-only';
import { env } from '@/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const db = () => createSupabaseAdminClient();

// ------------------------------------------------------------------ périodes (jours civils, heure de Paris)
const ymd = (offset: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() + offset * 86_400_000),
  );
const at = (day: string) => `${day} 00:00:00 Europe/Paris`;

export interface Period {
  days: 7 | 30 | 90;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
}

export function resolvePeriod(p: string | string[] | undefined): Period {
  const days = p === '7' ? 7 : p === '90' ? 90 : 30;
  return {
    days,
    from: at(ymd(-(days - 1))),
    to: at(ymd(1)),
    prevFrom: at(ymd(-(2 * days - 1))),
    prevTo: at(ymd(-(days - 1))),
  };
}

const dayLabel = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

// ------------------------------------------------------------------ audience
export async function getKpis(from: string, to: string) {
  const { data } = await db().rpc('admin_kpis', { p_from: from, p_to: to });
  const r = data?.[0];
  return {
    visitors: r?.visitors ?? 0,
    sessions: r?.sessions ?? 0,
    pageViews: r?.page_views ?? 0,
    clicks: r?.clicks ?? 0,
  };
}

export async function getDaily(p: Period) {
  const { data } = await db().rpc('admin_daily', { p_from: p.from, p_to: p.to });
  const rows = data ?? [];
  return {
    labels: rows.map((r) => dayLabel(r.day)),
    visitors: rows.map((r) => r.visitors),
    sessions: rows.map((r) => r.sessions),
    pageViews: rows.map((r) => r.page_views),
    clicks: rows.map((r) => r.clicks),
  };
}

export async function getChannelsDaily(p: Period) {
  const [daily, { data }] = await Promise.all([
    getDaily(p),
    db().rpc('admin_channels_daily', { p_from: p.from, p_to: p.to }),
  ]);
  const days =
    (await db().rpc('admin_daily', { p_from: p.from, p_to: p.to })).data?.map((r) => r.day) ?? [];
  const byChannel = new Map<string, number[]>();
  for (const row of data ?? []) {
    const arr = byChannel.get(row.channel) ?? days.map(() => 0);
    const i = days.indexOf(row.day);
    if (i >= 0) arr[i] = row.sessions;
    byChannel.set(row.channel, arr);
  }
  return { labels: daily.labels, byChannel };
}

export async function getSources(p: Period) {
  const { data } = await db().rpc('admin_sources', { p_from: p.from, p_to: p.to });
  return data ?? [];
}

export async function getTopPages(p: Period, limit = 12) {
  const { data } = await db().rpc('admin_top_pages', {
    p_from: p.from,
    p_to: p.to,
    p_limit: limit,
  });
  return data ?? [];
}

export async function getEntryPages(p: Period, limit = 8) {
  const { data } = await db().rpc('admin_entry_pages', {
    p_from: p.from,
    p_to: p.to,
    p_limit: limit,
  });
  return data ?? [];
}

export async function getTopClicks(p: Period, limit = 15) {
  const { data } = await db().rpc('admin_top_clicks', {
    p_from: p.from,
    p_to: p.to,
    p_limit: limit,
  });
  return data ?? [];
}

export async function getBreakdown(p: Period, dim: 'device' | 'country' | 'locale' | 'browser') {
  const { data } = await db().rpc('admin_breakdown', { p_from: p.from, p_to: p.to, p_dim: dim });
  return data ?? [];
}

export async function getJourney(p: Period) {
  const { data } = await db().rpc('admin_journey', { p_from: p.from, p_to: p.to });
  const r = data?.[0];
  return {
    sessions: r?.sessions ?? 0,
    multiPage: r?.multi_page ?? 0,
    plan: r?.viewed_plan ?? 0,
    pricing: r?.viewed_pricing ?? 0,
    login: r?.viewed_login ?? 0,
    clicked: r?.clicked ?? 0,
  };
}

/** Part des visiteurs qui acceptent la mesure d'audience (dernier choix de chaque navigateur). */
export async function getConsentRate() {
  const { data } = await db()
    .from('consent_logs')
    .select('anon_id, choices, ts')
    .order('ts', { ascending: false })
    .limit(5000);
  const latest = new Map<string, boolean>();
  for (const r of data ?? []) {
    if (!latest.has(r.anon_id))
      latest.set(r.anon_id, (r.choices as { analytics?: boolean } | null)?.analytics === true);
  }
  const total = latest.size;
  const accepted = [...latest.values()].filter(Boolean).length;
  return { total, accepted, rate: total ? Math.round((accepted / total) * 100) : null };
}

// ------------------------------------------------------------------ activité commerciale
export async function getBusiness() {
  const d = db();
  const [users, trips, messages, withHealth] = await Promise.all([
    d.auth.admin.listUsers({ page: 1, perPage: 1 }),
    d.from('trips').select('id', { count: 'exact', head: true }),
    d
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .in('status', ['new', 'open']),
    d.from('health_consents').select('id', { count: 'exact', head: true }).is('withdrawn_at', null),
  ]);
  const total =
    (users.data as unknown as { total?: number } | null)?.total ?? users.data?.users.length ?? 0;
  return {
    accounts: total,
    trips: trips.count ?? 0,
    openMessages: messages.count ?? 0,
    healthConsents: withHealth.count ?? 0,
  };
}

export async function getBadgeCounts() {
  const d = db();
  const [a, b] = await Promise.all([
    d
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'contact')
      .eq('status', 'new'),
    d
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .in('kind', ['rdv', 'pro'])
      .eq('status', 'new'),
  ]);
  return { demandes: a.count ?? 0, leads: b.count ?? 0 };
}

// ------------------------------------------------------------------ clients
export interface ClientRow {
  id: string;
  email: string;
  name: string;
  country: string | null;
  createdAt: string;
  lastSignIn: string | null;
  provider: string;
  offer: string | null;
  trips: number;
  profileComplete: boolean;
  healthConsent: boolean;
}

export async function getClients(q?: string): Promise<{ rows: ClientRow[]; total: number }> {
  const d = db();
  const list = await d.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = list.data?.users ?? [];
  const ids = users.map((u) => u.id);
  if (!ids.length) return { rows: [], total: 0 };
  const [profiles, ents, trips, consents] = await Promise.all([
    d
      .from('user_profiles')
      .select('user_id, first_name, last_name, country, birth_date, home_airport')
      .in('user_id', ids),
    d
      .from('entitlements')
      .select('user_id, offer, status, expires_at')
      .in('user_id', ids)
      .eq('status', 'active'),
    // Uniquement l'identifiant : le contenu des voyages (données de santé, chiffré) n'est jamais lu ici.
    d.from('trips').select('user_id').in('user_id', ids),
    d.from('health_consents').select('user_id').in('user_id', ids).is('withdrawn_at', null),
  ]);
  const prof = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
  const tripCount = new Map<string, number>();
  for (const t of trips.data ?? []) tripCount.set(t.user_id, (tripCount.get(t.user_id) ?? 0) + 1);
  const offers = new Map((ents.data ?? []).map((e) => [e.user_id ?? '', e.offer]));
  const consent = new Set((consents.data ?? []).map((c) => c.user_id));

  let rows: ClientRow[] = users.map((u) => {
    const p = prof.get(u.id);
    return {
      id: u.id,
      email: u.email ?? '',
      name: [p?.first_name, p?.last_name].filter(Boolean).join(' '),
      country: p?.country ?? null,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      provider: (u.app_metadata?.provider as string | undefined) ?? 'email',
      offer: offers.get(u.id) ?? null,
      trips: tripCount.get(u.id) ?? 0,
      profileComplete: !!(
        p?.first_name &&
        p.last_name &&
        p.birth_date &&
        p.country &&
        p.home_airport
      ),
      healthConsent: consent.has(u.id),
    };
  });
  const total = rows.length;
  const needle = q?.trim().toLowerCase();
  if (needle) rows = rows.filter((r) => `${r.email} ${r.name}`.toLowerCase().includes(needle));
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { rows, total };
}

// ------------------------------------------------------------------ demandes et leads
export async function getMessages(kinds: string[]) {
  const { data } = await db()
    .from('contact_messages')
    .select(
      'id, name, email, subject, message, status, kind, phone, preferred_slot, locale, created_at',
    )
    .in('kind', kinds)
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

// ------------------------------------------------------------------ nurturing
export async function getNurturing() {
  const d = db();
  const [subs, events, clients] = await Promise.all([
    d.from('newsletter_subscribers').select('status'),
    d.from('email_events').select('type').order('ts', { ascending: false }).limit(5000),
    getClients(),
  ]);
  const count = (arr: Array<{ status: string }> | null, s: string) =>
    (arr ?? []).filter((r) => r.status === s).length;
  const byType = new Map<string, number>();
  for (const e of events.data ?? []) byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
  return {
    confirmed: count(subs.data, 'confirmed'),
    pending: count(subs.data, 'pending'),
    unsubscribed: count(subs.data, 'unsubscribed'),
    emails: byType,
    accounts: clients.total,
    incompleteProfiles: clients.rows.filter((r) => !r.profileComplete).length,
    noTrip: clients.rows.filter((r) => r.trips === 0).length,
    withTrip: clients.rows.filter((r) => r.trips > 0).length,
  };
}

// ------------------------------------------------------------------ santé du système
export async function getSystem() {
  const d = db();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [last, day, audit, consent] = await Promise.all([
    d.from('events').select('ts').order('ts', { ascending: false }).limit(1),
    d.from('events').select('id', { count: 'exact', head: true }).gte('ts', since),
    d
      .from('audit_log')
      .select('id, action, target, ts')
      .order('ts', { ascending: false })
      .limit(15),
    getConsentRate(),
  ]);
  return {
    lastEvent: last.data?.[0]?.ts ?? null,
    fresh: !!last.data?.[0]?.ts && Date.now() - new Date(last.data[0].ts).getTime() < 86_400_000,
    events24h: day.count ?? 0,
    audit: audit.data ?? [],
    consent,
    flags: {
      ga: !!env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
      clarity: !!env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
      resend: !!env.RESEND_API_KEY,
      flights: !!env.AVIATIONSTACK_API_KEY,
      encryption: !!env.HEALTH_ENCRYPTION_KEY,
    },
  };
}

// ------------------------------------------------------------------ blog
export async function getBlogPosts() {
  const { data } = await db()
    .from('blog_posts')
    .select('id, title, slug, status, locale, topic, cover_url, updated_at, published_at')
    .order('updated_at', { ascending: false });
  return data ?? [];
}

export async function getBlogPost(id: string) {
  const { data } = await db().from('blog_posts').select('*').eq('id', id).maybeSingle();
  return data;
}
