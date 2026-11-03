-- Rôle d'un compte : client (accès selon son forfait), testeur (pilote : plan complet, sans espace admin),
-- admin (plan complet + espace administrateur, toujours protégé par le code d'ouverture).
-- Aucune ligne = client. Lecture de son propre rôle uniquement ; écriture réservée au serveur (service role).
create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'tester', 'admin')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.user_roles enable row level security;
create policy user_roles_select_own on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;
