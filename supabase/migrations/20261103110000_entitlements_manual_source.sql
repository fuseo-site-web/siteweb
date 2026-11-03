-- Offres accordées manuellement par un admin, en plus des achats (Stripe). Les deux coexistent :
-- changer l'offre manuelle ne touche jamais un achat.
alter table public.entitlements
  add column source text not null default 'stripe' check (source in ('stripe', 'manual')),
  add column granted_by uuid references auth.users (id) on delete set null;
create index entitlements_manual_idx on public.entitlements (user_id) where source = 'manual' and status = 'active';
