-- Langue dans laquelle Fuseo écrit à l'utilisateur (e-mails, support, nurturing). Vide = langue du site au moment de l'inscription.
alter table public.user_profiles
  add column preferred_locale text check (preferred_locale in ('fr', 'en', 'es'));
