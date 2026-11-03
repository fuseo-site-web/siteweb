-- Nurturing automatique : trace de chaque e-mail envoyé (une séquence n'est envoyée qu'une fois par compte, ou par voyage).
create table public.nurturing_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sequence text not null check (sequence in ('welcome', 'first-plan', 'pre-trip', 'post-trip', 'newsletter')),
  trip_id uuid references public.trips (id) on delete cascade,
  email_id text,
  sent_at timestamptz not null default now()
);
create unique index nurturing_sends_once_idx on public.nurturing_sends (user_id, sequence, coalesce(trip_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table public.nurturing_sends enable row level security;
revoke all on public.nurturing_sends from anon, authenticated;
