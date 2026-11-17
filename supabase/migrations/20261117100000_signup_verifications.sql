-- Vérification d'adresse à l'inscription : code à 8 chiffres envoyé par Fuseo (Resend), saisi sur le site.
-- Seul le hachage (HMAC) du code est stocké. Table réservée au serveur (clé service role) : aucune politique RLS.
create table public.signup_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now()
);
alter table public.signup_verifications enable row level security;
revoke all on public.signup_verifications from anon, authenticated;

-- Retrouve un compte par adresse e-mail (l'API Auth n'offre pas cette recherche) : identifiant + adresse confirmée ou non.
create function public.auth_user_by_email(p_email text)
returns table (id uuid, confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email_confirmed_at is not null
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;
revoke all on function public.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;

-- Compte un essai de saisie (atomique) et renvoie le hachage à comparer.
-- Renvoie null si le code est absent, expiré ou si les 5 essais sont épuisés : il faut alors en demander un nouveau.
create function public.signup_code_attempt(p_user uuid)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  update public.signup_verifications
  set attempts = attempts + 1
  where user_id = p_user and attempts < 5 and expires_at > now()
  returning code_hash;
$$;
revoke all on function public.signup_code_attempt(uuid) from public, anon, authenticated;
grant execute on function public.signup_code_attempt(uuid) to service_role;
