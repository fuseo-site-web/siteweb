-- Support client : un dossier par demande (numéro de référence), et ses messages (conversation client ↔ équipe).
-- Le client lit ses propres dossiers ; toute écriture passe par le serveur (contrôle, limites, e-mails).
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (ref ~ '^SUP-[A-Z0-9]{6}$'),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null check (char_length(email) <= 320),
  name text check (char_length(name) <= 160),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'es')),
  reason text not null check (reason in ('plan', 'account', 'payment', 'technical', 'health', 'other')),
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  unread_admin boolean not null default true,
  unread_user boolean not null default false,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index support_tickets_user_idx on public.support_tickets (user_id, last_message_at desc);
create index support_tickets_status_idx on public.support_tickets (status, last_message_at desc);
alter table public.support_tickets enable row level security;
create policy support_tickets_select_own on public.support_tickets
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.support_tickets from anon, authenticated;
grant select on public.support_tickets to authenticated;

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author text not null check (author in ('user', 'admin')),
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  email_id text,
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
alter table public.support_messages enable row level security;
create policy support_messages_select_own on public.support_messages
  for select to authenticated using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid())
    )
  );
revoke all on public.support_messages from anon, authenticated;
grant select on public.support_messages to authenticated;
