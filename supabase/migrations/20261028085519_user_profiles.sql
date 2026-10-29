-- Informations personnelles du compte (identité, pas de donnée de santé) : propriétaire seul.
create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text check (first_name is null or char_length(first_name) between 1 and 80),
  last_name text check (last_name is null or char_length(last_name) between 1 and 80),
  birth_date date check (birth_date is null or birth_date >= date '1900-01-01'),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  home_airport text check (home_airport is null or home_airport ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_profiles_updated_at before update on public.user_profiles
  for each row execute function private.set_updated_at();

alter table public.user_profiles enable row level security;

create policy user_profiles_select on public.user_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_profiles_insert on public.user_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_profiles_update on public.user_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy user_profiles_delete on public.user_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.user_profiles from anon, authenticated;
grant select, delete on public.user_profiles to authenticated;
grant insert (user_id, first_name, last_name, birth_date, country, home_airport) on public.user_profiles to authenticated;
grant update (first_name, last_name, birth_date, country, home_airport) on public.user_profiles to authenticated;
