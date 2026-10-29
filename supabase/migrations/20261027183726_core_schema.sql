-- Lot 2 : schéma principal. RLS activée sur chaque table ; sans policy, l'accès est refusé.
-- Les champs de santé (*_enc) sont chiffrés par l'application (AES-256-GCM) ; aucune policy admin sur ces tables.

-- ---------------------------------------------------------------- admin
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'analyst', 'support')),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- Vrai seulement pour un admin connecté avec MFA (aal2). 'owner' passe tous les contrôles de rôle.
create or replace function private.is_admin(required_role text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1
      from public.admin_users a
      where a.user_id = auth.uid()
        and (required_role is null or a.role = required_role or a.role = 'owner')
    );
$$;
revoke all on function private.is_admin(text) from public, anon;
grant execute on function private.is_admin(text) to authenticated;

create policy admin_users_select on public.admin_users
  for select to authenticated using ((select private.is_admin()));
create policy admin_users_insert on public.admin_users
  for insert to authenticated with check ((select private.is_admin('owner')));
create policy admin_users_update on public.admin_users
  for update to authenticated using ((select private.is_admin('owner'))) with check ((select private.is_admin('owner')));
create policy admin_users_delete on public.admin_users
  for delete to authenticated using ((select private.is_admin('owner')));
grant select, insert, update, delete on public.admin_users to authenticated;

-- ---------------------------------------------------------------- accès payants
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  offer text not null check (offer in ('voyage', 'annuel', 'ami', 'pro')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  amount_cents integer check (amount_cents >= 0),
  currency text check (currency ~ '^[a-z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked', 'expired')),
  starts_at timestamptz,
  expires_at timestamptz,
  trip_credits integer not null default 0 check (trip_credits >= 0),
  cgv_version text,
  cgv_accepted_at timestamptz,
  withdrawal_waiver_at timestamptz,
  created_at timestamptz not null default now()
);
create index entitlements_user_id_idx on public.entitlements (user_id);
create index entitlements_email_idx on public.entitlements (lower(email));
alter table public.entitlements enable row level security;
create policy entitlements_select_own on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));
create policy entitlements_select_admin on public.entitlements
  for select to authenticated using ((select private.is_admin()));
grant select on public.entitlements to authenticated;

-- ---------------------------------------------------------------- consentement santé
create table public.health_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null default 'health_data' check (purpose in ('health_data')),
  policy_version text not null,
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create unique index health_consents_active_idx on public.health_consents (user_id, purpose) where withdrawn_at is null;
alter table public.health_consents enable row level security;
create policy health_consents_select_own on public.health_consents
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.health_consents to authenticated;

create or replace function private.has_health_consent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.health_consents c
    where c.user_id = auth.uid() and c.purpose = 'health_data' and c.withdrawn_at is null
  );
$$;
revoke all on function private.has_health_consent() from public, anon;
grant execute on function private.has_health_consent() to authenticated;

-- ---------------------------------------------------------------- données de santé (propriétaire seul, écriture soumise au consentement)
create table public.sleep_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload_enc text not null,
  key_id text not null,
  updated_at timestamptz not null default now()
);
create table public.medical_screenings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers_enc text not null,
  melatonin_eligible boolean not null,
  key_id text not null,
  updated_at timestamptz not null default now()
);
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement_id uuid references public.entitlements (id) on delete set null,
  route_summary text not null check (route_summary ~ '^[A-Z]{3}(-[A-Z]{3}){1,9}$'),
  inputs_enc text not null,
  plan_enc text,
  key_id text not null,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delete_after timestamptz
);
create index trips_user_id_idx on public.trips (user_id);
create index trips_entitlement_id_idx on public.trips (entitlement_id);
create index trips_delete_after_idx on public.trips (delete_after);

create trigger sleep_profiles_updated_at before update on public.sleep_profiles
  for each row execute function private.set_updated_at();
create trigger medical_screenings_updated_at before update on public.medical_screenings
  for each row execute function private.set_updated_at();
create trigger trips_updated_at before update on public.trips
  for each row execute function private.set_updated_at();

alter table public.sleep_profiles enable row level security;
alter table public.medical_screenings enable row level security;
alter table public.trips enable row level security;

create policy sleep_profiles_select on public.sleep_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy sleep_profiles_insert on public.sleep_profiles
  for insert to authenticated with check (user_id = (select auth.uid()) and (select private.has_health_consent()));
create policy sleep_profiles_update on public.sleep_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.has_health_consent()));
create policy sleep_profiles_delete on public.sleep_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

create policy medical_screenings_select on public.medical_screenings
  for select to authenticated using (user_id = (select auth.uid()));
create policy medical_screenings_insert on public.medical_screenings
  for insert to authenticated with check (user_id = (select auth.uid()) and (select private.has_health_consent()));
create policy medical_screenings_update on public.medical_screenings
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.has_health_consent()));
create policy medical_screenings_delete on public.medical_screenings
  for delete to authenticated using (user_id = (select auth.uid()));

create policy trips_select on public.trips
  for select to authenticated using (user_id = (select auth.uid()));
create policy trips_insert on public.trips
  for insert to authenticated with check (user_id = (select auth.uid()) and (select private.has_health_consent()));
create policy trips_update on public.trips
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select private.has_health_consent()));
create policy trips_delete on public.trips
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.sleep_profiles, public.medical_screenings, public.trips to authenticated;

-- ---------------------------------------------------------------- anti-abus
create table public.rate_limits (
  key_hash text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key_hash, window_start)
);
alter table public.rate_limits enable row level security;

-- Compteur atomique à fenêtre fixe. Renvoie vrai tant que la limite n'est pas dépassée. Service role uniquement.
create or replace function public.rate_limit_hit(p_key_hash text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'paramètres de limitation invalides';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as r (key_hash, window_start, count)
  values (p_key_hash, v_window, 1)
  on conflict (key_hash, window_start) do update set count = r.count + 1
  returning r.count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------- Stripe et codes promo
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code_hmac text not null unique,
  offer text not null check (offer in ('voyage', 'annuel', 'ami', 'pro')),
  quota integer not null check (quota > 0),
  redeemed_count integer not null default 0 check (redeemed_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promo_codes (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  entitlement_id uuid references public.entitlements (id) on delete set null,
  redeemed_at timestamptz not null default now()
);
create index promo_redemptions_promo_id_idx on public.promo_redemptions (promo_id);
create index promo_redemptions_user_id_idx on public.promo_redemptions (user_id);
create index promo_redemptions_entitlement_id_idx on public.promo_redemptions (entitlement_id);
create index promo_codes_created_by_idx on public.promo_codes (created_by);
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
create policy promo_codes_select_admin on public.promo_codes
  for select to authenticated using ((select private.is_admin()));
create policy promo_redemptions_select_admin on public.promo_redemptions
  for select to authenticated using ((select private.is_admin()));
grant select on public.promo_codes, public.promo_redemptions to authenticated;

-- ---------------------------------------------------------------- consentement cookies, contact, newsletter, e-mails
create table public.consent_logs (
  id uuid primary key default gen_random_uuid(),
  anon_id uuid not null,
  choices jsonb not null,
  policy_version text not null,
  source text not null default 'banner',
  ts timestamptz not null default now()
);
create index consent_logs_ts_idx on public.consent_logs (ts);
alter table public.consent_logs enable row level security;
create policy consent_logs_select_admin on public.consent_logs
  for select to authenticated using ((select private.is_admin()));
grant select on public.consent_logs to authenticated;

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 200),
  email text not null check (char_length(email) <= 320),
  subject text not null check (char_length(subject) <= 200),
  message text not null check (char_length(message) <= 5000),
  locale text not null default 'fr',
  status text not null default 'new' check (status in ('new', 'open', 'answered', 'closed')),
  assignee uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_assignee_idx on public.contact_messages (assignee);
create index contact_messages_status_idx on public.contact_messages (status, created_at);
alter table public.contact_messages enable row level security;
create policy contact_messages_select_admin on public.contact_messages
  for select to authenticated using ((select private.is_admin('support')));
create policy contact_messages_update_admin on public.contact_messages
  for update to authenticated using ((select private.is_admin('support'))) with check ((select private.is_admin('support')));
grant select, update on public.contact_messages to authenticated;

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 320),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  consent_at timestamptz,
  consent_text_version text,
  source text,
  token_hash text,
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create unique index newsletter_subscribers_email_idx on public.newsletter_subscribers (lower(email));
alter table public.newsletter_subscribers enable row level security;
create policy newsletter_subscribers_select_admin on public.newsletter_subscribers
  for select to authenticated using ((select private.is_admin('support')));
grant select on public.newsletter_subscribers to authenticated;

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  resend_id text not null,
  type text not null,
  ts timestamptz not null default now(),
  unique (resend_id, type, ts)
);
create index email_events_ts_idx on public.email_events (ts);
alter table public.email_events enable row level security;
create policy email_events_select_admin on public.email_events
  for select to authenticated using ((select private.is_admin()));
grant select on public.email_events to authenticated;

-- ---------------------------------------------------------------- SEO et audit
create table public.gsc_daily (
  date date not null,
  query text not null,
  page text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr real not null default 0,
  position real not null default 0,
  primary key (date, query, page)
);
alter table public.gsc_daily enable row level security;
create policy gsc_daily_select_admin on public.gsc_daily
  for select to authenticated using ((select private.is_admin()));
grant select on public.gsc_daily to authenticated;

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users (id) on delete set null,
  action text not null,
  target text,
  ip_hash text,
  meta jsonb,
  ts timestamptz not null default now()
);
create index audit_log_actor_idx on public.audit_log (actor);
create index audit_log_ts_idx on public.audit_log (ts);
alter table public.audit_log enable row level security;
create policy audit_log_select_owner on public.audit_log
  for select to authenticated using ((select private.is_admin('owner')));
grant select on public.audit_log to authenticated;
