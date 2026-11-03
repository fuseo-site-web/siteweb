-- Paiements (Stripe) : historique des paiements et identifiant client Stripe.
-- Lecture de ses propres lignes uniquement ; écriture réservée au serveur (webhook Stripe, clé service role).
create table public.billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
create policy billing_customers_select_own on public.billing_customers
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.billing_customers from anon, authenticated;
grant select on public.billing_customers to authenticated;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  entitlement_id uuid references public.entitlements (id) on delete set null,
  offer text not null check (offer in ('voyage', 'annuel', 'ami', 'pro')),
  description text check (char_length(description) <= 200),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_checkout_session text unique,
  stripe_payment_intent text unique,
  receipt_url text check (char_length(receipt_url) <= 500),
  invoice_url text check (char_length(invoice_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
create policy payments_select_own on public.payments
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
