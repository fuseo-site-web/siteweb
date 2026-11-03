-- Demandes de suppression de compte : le client explique pourquoi, l'équipe supprime depuis l'espace admin.
-- La demande survit à la suppression du compte (user_id passe à null), pour garder la trace du traitement (RGPD).
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null check (char_length(email) <= 320),
  reason text not null check (reason in ('not_useful', 'no_trip', 'privacy', 'too_many_emails', 'other_service', 'other')),
  comment text check (char_length(comment) <= 1000),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'es')),
  status text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users (id) on delete set null
);
create index account_deletion_requests_status_idx on public.account_deletion_requests (status, created_at desc);
create unique index account_deletion_requests_pending_idx on public.account_deletion_requests (user_id) where status = 'pending';
alter table public.account_deletion_requests enable row level security;
create policy account_deletion_requests_select_own on public.account_deletion_requests
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
