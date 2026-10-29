# État du projet Supabase `wxpeabqrpwcrkpddjcew` (dev)

Relevé en lecture seule le 2026-10-27, avant toute migration.

- Tables `public` : aucune. Migrations : aucune. Branches : aucune.
- Extensions installées : `pgcrypto` (schéma `extensions`), `supabase_vault`, `pg_stat_statements`, `uuid-ossp`.
- Disponibles, à activer par migration quand nécessaire : `pg_cron`, `pg_partman` (partition mensuelle de `events`), `pgtap` (tests RLS).
- Advisors performance : aucune alerte.
- Advisors sécurité : 2 alertes WARN sur `public.rls_auto_enable()` (fonction `SECURITY DEFINER` du déclencheur `ensure_rls`, appelable par `anon` et `authenticated` via `/rest/v1/rpc`). Le déclencheur active la RLS sur toute table créée dans `public` : on le conserve, on retire seulement l'accès public à la fonction.
- Le chiffrement des champs de santé est fait côté application (AES-256-GCM), pas avec `pgcrypto`.
