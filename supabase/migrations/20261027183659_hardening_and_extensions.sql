-- Lot 1 : durcissement de base, schéma privé, pg_cron, privilèges par défaut fermés.

-- L'assistant RLS de Supabase (déclencheur ensure_rls) reste actif ; seul son accès public via /rest/v1/rpc est retiré.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Schéma non exposé par l'API : fonctions de contrôle d'accès et partitions.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create extension if not exists pg_cron with schema pg_catalog;

-- Privilèges par défaut : aucune table, séquence ou fonction ouverte à anon/authenticated sans GRANT explicite.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
