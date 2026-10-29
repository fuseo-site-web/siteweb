-- Lot 3 : événements d'audience (partition mensuelle, rétention 13 mois), agrégats, tâches pg_cron.
-- `events` n'a volontairement aucune colonne user_id : aucune jointure possible avec les données de santé.

create table public.events (
  ts timestamptz not null default now(),
  visitor_id uuid not null,
  session_id uuid not null,
  name text not null check (char_length(name) <= 64),
  path text check (char_length(path) <= 512),
  referrer_host text check (char_length(referrer_host) <= 253),
  utm_source text check (char_length(utm_source) <= 128),
  utm_medium text check (char_length(utm_medium) <= 128),
  utm_campaign text check (char_length(utm_campaign) <= 128),
  utm_term text check (char_length(utm_term) <= 128),
  utm_content text check (char_length(utm_content) <= 128),
  country text check (country ~ '^[A-Z]{2}$'),
  device_class text check (device_class in ('desktop', 'mobile', 'tablet', 'bot', 'unknown')),
  browser text check (char_length(browser) <= 64),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),
  consent_version text not null
) partition by range (ts);
create index events_ts_idx on public.events (ts);
create index events_name_ts_idx on public.events (name, ts);
alter table public.events enable row level security;
create policy events_select_admin on public.events
  for select to authenticated using ((select private.is_admin()));
grant select on public.events to authenticated;

create table public.daily_stats (
  day date not null,
  path text not null,
  source text not null default '(direct)',
  page_views integer not null default 0,
  visitors integer not null default 0,
  sessions integer not null default 0,
  primary key (day, path, source)
);
alter table public.daily_stats enable row level security;
create policy daily_stats_select_admin on public.daily_stats
  for select to authenticated using ((select private.is_admin()));
grant select on public.daily_stats to authenticated;

-- Les partitions vivent dans le schéma privé (non exposé par l'API) avec RLS activée.
create or replace function private.ensure_events_partitions(p_months_ahead integer default 2)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m date;
  part text;
  i integer;
begin
  for i in 0..p_months_ahead loop
    m := (date_trunc('month', now() at time zone 'utc') + make_interval(months => i))::date;
    part := 'events_' || to_char(m, 'YYYY_MM');
    if to_regclass(format('private.%I', part)) is null then
      execute format(
        'create table private.%I partition of public.events for values from (%L) to (%L)',
        part, m::text || ' 00:00:00+00', (m + interval '1 month')::date::text || ' 00:00:00+00'
      );
      execute format('alter table private.%I enable row level security', part);
    end if;
  end loop;
end;
$$;

-- Rétention des événements : supprime les partitions de plus de p_retention_months mois.
create or replace function private.drop_expired_events_partitions(p_retention_months integer default 13)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    join pg_namespace pn on pn.oid = p.relnamespace
    where pn.nspname = 'public' and p.relname = 'events' and c.relname ~ '^events_[0-9]{4}_[0-9]{2}$'
  loop
    if to_date(substr(r.relname, 8), 'YYYY_MM') < (date_trunc('month', now()) - make_interval(months => p_retention_months))::date then
      execute format('drop table private.%I', r.relname);
    end if;
  end loop;
end;
$$;

revoke all on function private.ensure_events_partitions(integer) from public, anon, authenticated;
revoke all on function private.drop_expired_events_partitions(integer) from public, anon, authenticated;
grant execute on function private.ensure_events_partitions(integer), private.drop_expired_events_partitions(integer) to service_role;

select private.ensure_events_partitions(2);

select cron.schedule('events_ensure_partitions', '5 0 25 * *', $$select private.ensure_events_partitions(2)$$);
select cron.schedule('events_drop_expired', '30 3 1 * *', $$select private.drop_expired_events_partitions(13)$$);
select cron.schedule('rate_limits_purge', '17 * * * *', $$delete from public.rate_limits where window_start < now() - interval '1 day'$$);
