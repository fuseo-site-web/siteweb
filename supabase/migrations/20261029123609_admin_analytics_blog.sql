-- Espace administrateur : statistiques d'audience internes (sous consentement), blog éditable, demandes typées.
-- Aucune policy sur `events` : seule la clé service role (serveur, après contrôle d'accès admin) y accède.

-- ---------------------------------------------------------------- événements d'audience
create table public.events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  visitor_id uuid not null,
  session_id uuid not null,
  name text not null check (name in ('page_view', 'click')),
  path text not null check (char_length(path) <= 300),
  locale text check (locale in ('fr', 'en', 'es')),
  is_entry boolean not null default false,
  referrer_host text check (char_length(referrer_host) <= 200),
  channel text check (channel in ('ai', 'search', 'social', 'email', 'campaign', 'referral', 'direct')),
  source text check (char_length(source) <= 80),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  country text check (char_length(country) <= 2),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  browser text check (char_length(browser) <= 40),
  label text check (char_length(label) <= 120),
  target text check (char_length(target) <= 300),
  consent_version text
);
create index events_ts_idx on public.events (ts);
create index events_name_ts_idx on public.events (name, ts);
create index events_session_idx on public.events (session_id);
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

-- ---------------------------------------------------------------- blog éditable
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'es')),
  title text not null check (char_length(title) between 3 and 200),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  topic text not null default 'Conseils' check (char_length(topic) <= 60),
  body_md text not null default '' check (char_length(body_md) <= 60000),
  cover_url text check (char_length(cover_url) <= 500),
  cover_alt text not null default '' check (char_length(cover_alt) <= 200),
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 200),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_posts_status_idx on public.blog_posts (status, published_at desc);
alter table public.blog_posts enable row level security;
create policy blog_posts_public_read on public.blog_posts
  for select to anon, authenticated using (status = 'published');
revoke all on public.blog_posts from anon, authenticated;
grant select on public.blog_posts to anon, authenticated;

-- ---------------------------------------------------------------- demandes : type, téléphone, créneau souhaité
alter table public.contact_messages
  add column kind text not null default 'contact' check (kind in ('contact', 'rdv', 'pro')),
  add column phone text check (char_length(phone) <= 40),
  add column preferred_slot text check (char_length(preferred_slot) <= 200);

-- ---------------------------------------------------------------- bucket public des images du blog (WebP uniquement)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-images', 'blog-images', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- agrégations pour l'espace admin (service role uniquement)
create or replace function public.admin_kpis(p_from timestamptz, p_to timestamptz)
returns table (visitors bigint, sessions bigint, page_views bigint, clicks bigint)
language sql stable set search_path = '' as $$
  select count(distinct visitor_id), count(distinct session_id),
         count(*) filter (where name = 'page_view'), count(*) filter (where name = 'click')
  from public.events where ts >= p_from and ts < p_to;
$$;

create or replace function public.admin_daily(p_from timestamptz, p_to timestamptz)
returns table (day date, visitors bigint, sessions bigint, page_views bigint, clicks bigint)
language sql stable set search_path = '' as $$
  with d as (
    select generate_series(
      (p_from at time zone 'Europe/Paris')::date,
      ((p_to - interval '1 second') at time zone 'Europe/Paris')::date,
      interval '1 day')::date as day
  ), e as (
    select (ts at time zone 'Europe/Paris')::date as day, visitor_id, session_id, name
    from public.events where ts >= p_from and ts < p_to
  )
  select d.day, count(distinct e.visitor_id), count(distinct e.session_id),
         count(*) filter (where e.name = 'page_view'), count(*) filter (where e.name = 'click')
  from d left join e using (day) group by d.day order by d.day;
$$;

create or replace function public.admin_channels_daily(p_from timestamptz, p_to timestamptz)
returns table (day date, channel text, sessions bigint)
language sql stable set search_path = '' as $$
  select (ts at time zone 'Europe/Paris')::date, coalesce(channel, 'direct'), count(distinct session_id)
  from public.events where is_entry and ts >= p_from and ts < p_to group by 1, 2 order by 1;
$$;

create or replace function public.admin_sources(p_from timestamptz, p_to timestamptz)
returns table (channel text, source text, sessions bigint, visitors bigint)
language sql stable set search_path = '' as $$
  select coalesce(channel, 'direct'), coalesce(source, 'Direct'), count(distinct session_id), count(distinct visitor_id)
  from public.events where is_entry and ts >= p_from and ts < p_to
  group by 1, 2 order by 3 desc limit 30;
$$;

create or replace function public.admin_top_pages(p_from timestamptz, p_to timestamptz, p_limit int default 15)
returns table (path text, views bigint, visitors bigint)
language sql stable set search_path = '' as $$
  select path, count(*), count(distinct visitor_id)
  from public.events where name = 'page_view' and ts >= p_from and ts < p_to
  group by path order by 2 desc limit p_limit;
$$;

create or replace function public.admin_entry_pages(p_from timestamptz, p_to timestamptz, p_limit int default 10)
returns table (path text, sessions bigint)
language sql stable set search_path = '' as $$
  select path, count(distinct session_id)
  from public.events where is_entry and ts >= p_from and ts < p_to
  group by path order by 2 desc limit p_limit;
$$;

create or replace function public.admin_top_clicks(p_from timestamptz, p_to timestamptz, p_limit int default 20)
returns table (label text, target text, path text, clicks bigint, visitors bigint)
language sql stable set search_path = '' as $$
  select coalesce(label, '(sans libellé)'), target, path, count(*), count(distinct visitor_id)
  from public.events where name = 'click' and ts >= p_from and ts < p_to
  group by 1, 2, 3 order by 4 desc limit p_limit;
$$;

create or replace function public.admin_breakdown(p_from timestamptz, p_to timestamptz, p_dim text)
returns table (value text, sessions bigint)
language sql stable set search_path = '' as $$
  select coalesce(case p_dim when 'device' then device when 'country' then country
                              when 'locale' then locale when 'browser' then browser end, 'inconnu'),
         count(distinct session_id)
  from public.events where is_entry and ts >= p_from and ts < p_to
  group by 1 order by 2 desc limit 12;
$$;

create or replace function public.admin_journey(p_from timestamptz, p_to timestamptz)
returns table (sessions bigint, multi_page bigint, viewed_plan bigint, viewed_pricing bigint, viewed_login bigint, clicked bigint)
language sql stable set search_path = '' as $$
  with s as (
    select session_id,
           count(*) filter (where name = 'page_view') as pv,
           bool_or(name = 'page_view' and path in ('/plan-anti-jet-lag', '/en/jet-lag-plan', '/es/plan-antijet-lag')) as plan,
           bool_or(name = 'page_view' and path in ('/tarifs', '/en/pricing', '/es/precios')) as pricing,
           bool_or(name = 'page_view' and path in ('/connexion', '/en/sign-in', '/es/iniciar-sesion')) as login,
           bool_or(name = 'click') as clk
    from public.events where ts >= p_from and ts < p_to group by session_id
  )
  select count(*), count(*) filter (where pv >= 2), count(*) filter (where plan),
         count(*) filter (where pricing), count(*) filter (where login), count(*) filter (where clk)
  from s;
$$;

revoke execute on function
  public.admin_kpis(timestamptz, timestamptz), public.admin_daily(timestamptz, timestamptz),
  public.admin_channels_daily(timestamptz, timestamptz), public.admin_sources(timestamptz, timestamptz),
  public.admin_top_pages(timestamptz, timestamptz, int), public.admin_entry_pages(timestamptz, timestamptz, int),
  public.admin_top_clicks(timestamptz, timestamptz, int), public.admin_breakdown(timestamptz, timestamptz, text),
  public.admin_journey(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function
  public.admin_kpis(timestamptz, timestamptz), public.admin_daily(timestamptz, timestamptz),
  public.admin_channels_daily(timestamptz, timestamptz), public.admin_sources(timestamptz, timestamptz),
  public.admin_top_pages(timestamptz, timestamptz, int), public.admin_entry_pages(timestamptz, timestamptz, int),
  public.admin_top_clicks(timestamptz, timestamptz, int), public.admin_breakdown(timestamptz, timestamptz, text),
  public.admin_journey(timestamptz, timestamptz)
  to service_role;
