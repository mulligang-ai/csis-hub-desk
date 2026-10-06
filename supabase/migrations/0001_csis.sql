-- CSIS Hub Desk — initial schema.
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
-- One row per agent (auth user). The first user to sign up becomes an active
-- admin; everyone after that waits for an admin to activate them.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'agent' check (role in ('admin', 'agent')),
  active boolean not null default false,
  signature text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when first_user then 'admin' else 'agent' end,
    first_user
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and active and role = 'admin'
  );
$$;

-- --------------------------------------------------------------- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  phone text not null default '',
  company text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create unique index customers_email_key on public.customers (lower(email));

-- ----------------------------------------------------------------- tickets
create sequence public.ticket_number_seq start 1001;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.ticket_number_seq'),
  subject text not null,
  status text not null default 'active'
    check (status in ('active', 'waiting', 'on_hold', 'solved', 'closed', 'spam')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  type text not null default 'question'
    check (type in ('question', 'incident', 'problem', 'task')),
  source text not null default 'email' check (source in ('email', 'portal', 'agent')),
  assignee_id uuid references public.profiles (id) on delete set null,
  customer_id uuid not null references public.customers (id) on delete cascade,
  tags text[] not null default '{}',
  -- Unguessable token for the customer's portal link to this ticket.
  access_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  first_response_at timestamptz,
  solved_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_status_idx on public.tickets (status, last_message_at desc);
create index tickets_assignee_idx on public.tickets (assignee_id);
create index tickets_customer_idx on public.tickets (customer_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tickets_touch before update on public.tickets
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- messages
-- kind: customer = inbound from the customer, reply = agent → customer,
-- note = internal, never shown to the customer.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  kind text not null check (kind in ('customer', 'reply', 'note')),
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  -- RFC 5322 Message-ID of inbound mail; used to thread and to drop webhook retries.
  email_message_id text,
  created_at timestamptz not null default now()
);
create index messages_ticket_idx on public.messages (ticket_id, created_at);
create unique index messages_email_message_id_key
  on public.messages (email_message_id) where email_message_id is not null;

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  filename text not null,
  content_type text not null default 'application/octet-stream',
  size integer not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index attachments_ticket_idx on public.attachments (ticket_id);

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  description text not null,
  created_at timestamptz not null default now()
);
create index ticket_events_ticket_idx on public.ticket_events (ticket_id, created_at);

-- --------------------------------------------------------------- canned replies
create table public.canned_responses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ help docs (KB)
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null default 'General',
  body text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public)
values ('csis-attachments', 'csis-attachments', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------ row security
-- The customer portal and the inbound-email webhook run server-side with the
-- service-role key (which bypasses RLS). Everything else goes through the
-- signed-in agent, so the policies only need to describe agents.
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.tickets enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.ticket_events enable row level security;
alter table public.canned_responses enable row level security;
alter table public.articles enable row level security;

create policy "agents read profiles" on public.profiles
  for select using (public.is_agent() or id = auth.uid());
create policy "admins update profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy "agents all customers" on public.customers
  for all using (public.is_agent()) with check (public.is_agent());
create policy "agents all tickets" on public.tickets
  for all using (public.is_agent()) with check (public.is_agent());
create policy "agents all messages" on public.messages
  for all using (public.is_agent()) with check (public.is_agent());
create policy "agents all attachments" on public.attachments
  for all using (public.is_agent()) with check (public.is_agent());
create policy "agents all ticket_events" on public.ticket_events
  for all using (public.is_agent()) with check (public.is_agent());
create policy "agents all canned_responses" on public.canned_responses
  for all using (public.is_agent()) with check (public.is_agent());
create policy "agents all articles" on public.articles
  for all using (public.is_agent()) with check (public.is_agent());

create policy "agents read attachment files" on storage.objects
  for select using (bucket_id = 'csis-attachments' and public.is_agent());
