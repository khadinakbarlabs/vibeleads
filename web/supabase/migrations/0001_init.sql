-- VibeLeads — initial schema (v1)
-- Reviewed against Supabase RLS best practices: SECURITY DEFINER helpers,
-- (SELECT auth.uid()) in policies for initplan caching, RLS enabled on
-- every public table, no service-role-only tables in public schema.

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────
create type account_role as enum ('owner', 'admin', 'member');

create type search_status as enum (
  'queued', 'routing', 'running', 'normalizing', 'enriching', 'completed', 'failed', 'canceled'
);

create type search_intent as enum (
  'local_business',   -- → Google Maps actor
  'web_serp',         -- → Google Search SERP actor
  'contact_form',     -- → contact form submitter
  'gmaps_leads'       -- → Google Maps lead extractor
);

create type lead_email_status as enum ('pending', 'valid', 'invalid', 'risky', 'unknown', 'skipped');
create type lead_phone_status as enum ('pending', 'valid', 'invalid', 'unknown', 'skipped');
create type lead_enrichment_state as enum ('pending', 'running', 'done', 'failed');

create type export_type as enum ('csv', 'instantly', 'webhook', 'smartlead', 'google_sheets');
create type export_status as enum ('pending', 'running', 'succeeded', 'failed');

create type ledger_reason as enum (
  'signup_grant',
  'subscription_grant',
  'topup',
  'search_run',
  'lead_normalize',
  'email_validate',
  'phone_normalize',
  'social_discovery',
  'export_instantly',
  'export_webhook',
  'export_csv',
  'refund',
  'manual_adjustment'
);

create type subscription_plan as enum ('free', 'starter', 'pro', 'scale');
create type subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled',
  'incomplete', 'incomplete_expired', 'unpaid', 'paused'
);

create type integration_kind as enum ('instantly', 'webhook', 'smartlead', 'google_sheets');

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- accounts
-- ─────────────────────────────────────────────────────────────────────────────
create table public.accounts (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- account_members
-- ─────────────────────────────────────────────────────────────────────────────
create table public.account_members (
  account_id   uuid not null references public.accounts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         account_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index account_members_user_idx on public.account_members(user_id);

alter table public.account_members enable row level security;

-- Helper: is the caller a member of the given account?
create or replace function public.is_account_member(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_members
    where account_id = p_account_id
      and user_id = (select auth.uid())
  );
$$;

-- Helper: list of accounts the caller belongs to
create or replace function public.my_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select account_id from public.account_members where user_id = (select auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- api_keys (for future MCP / programmatic access)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.api_keys (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  name          text not null,
  key_hash      text not null unique,
  key_prefix    text not null,           -- displayed as `vl_xxxx…` in UI
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

create index api_keys_account_idx on public.api_keys(account_id) where revoked_at is null;

alter table public.api_keys enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- subscriptions
-- ─────────────────────────────────────────────────────────────────────────────
create table public.subscriptions (
  id                          uuid primary key default uuid_generate_v4(),
  account_id                  uuid not null references public.accounts(id) on delete cascade,
  stripe_customer_id          text,
  stripe_subscription_id      text unique,
  plan                        subscription_plan not null default 'free',
  status                      subscription_status not null default 'active',
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  cancel_at_period_end        boolean not null default false,
  trial_end                   timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create unique index subscriptions_one_active_per_account
  on public.subscriptions(account_id)
  where status in ('active', 'trialing', 'past_due');

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- credit_ledger (append-only)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.credit_ledger (
  id           uuid primary key default uuid_generate_v4(),
  account_id   uuid not null references public.accounts(id) on delete cascade,
  delta        integer not null,                    -- positive grants, negative spends
  reason       ledger_reason not null,
  ref_kind     text,                                -- e.g. 'search', 'export', 'subscription'
  ref_id       uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index credit_ledger_account_idx on public.credit_ledger(account_id, created_at desc);

alter table public.credit_ledger enable row level security;

-- View: current balance per account (always non-negative if spend is gated)
create or replace view public.account_credit_balance as
  select account_id, coalesce(sum(delta), 0)::bigint as balance
  from public.credit_ledger
  group by account_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- searches
-- ─────────────────────────────────────────────────────────────────────────────
create table public.searches (
  id                    uuid primary key default uuid_generate_v4(),
  account_id            uuid not null references public.accounts(id) on delete cascade,
  user_id               uuid references auth.users(id) on delete set null,
  prompt                text not null,
  intent                search_intent,
  actor_id              text,                       -- Apify actor id used
  actor_input           jsonb,
  actor_run_id          text,
  status                search_status not null default 'queued',
  status_reason         text,
  lead_count            integer not null default 0,
  credits_estimated     integer not null default 0,
  credits_spent         integer not null default 0,
  enrich_email          boolean not null default true,
  enrich_socials        boolean not null default true,
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index searches_account_created_idx on public.searches(account_id, created_at desc);
create index searches_status_idx on public.searches(status) where status in ('queued', 'routing', 'running', 'normalizing', 'enriching');
create index searches_actor_run_idx on public.searches(actor_run_id) where actor_run_id is not null;

create trigger searches_set_updated_at
before update on public.searches
for each row execute function public.set_updated_at();

alter table public.searches enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- leads
-- ─────────────────────────────────────────────────────────────────────────────
create table public.leads (
  id                  uuid primary key default uuid_generate_v4(),
  account_id          uuid not null references public.accounts(id) on delete cascade,
  search_id           uuid not null references public.searches(id) on delete cascade,
  business_name       text,
  contact_name        text,
  category            text,
  categories          text[],
  address             text,
  city                text,
  region              text,
  country             text,
  postal_code         text,
  lat                 double precision,
  lng                 double precision,
  website             text,
  emails              text[] not null default '{}',
  phones              text[] not null default '{}',
  socials             jsonb not null default '{}'::jsonb,
  rating              numeric(3, 2),
  review_count        integer,
  hours               jsonb,
  description         text,
  raw                 jsonb not null default '{}'::jsonb,
  dedupe_key          text not null,
  email_status        lead_email_status not null default 'pending',
  phone_status        lead_phone_status not null default 'pending',
  enrichment_state    lead_enrichment_state not null default 'pending',
  enrichment_error    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (account_id, dedupe_key)
);

create index leads_search_idx on public.leads(search_id, created_at);
create index leads_account_created_idx on public.leads(account_id, created_at desc);
create index leads_email_status_idx on public.leads(email_status);
create index leads_socials_gin on public.leads using gin (socials);
create index leads_categories_gin on public.leads using gin (categories);

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- lists
-- ─────────────────────────────────────────────────────────────────────────────
create table public.lists (
  id           uuid primary key default uuid_generate_v4(),
  account_id   uuid not null references public.accounts(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index lists_account_idx on public.lists(account_id, created_at desc);

create trigger lists_set_updated_at
before update on public.lists
for each row execute function public.set_updated_at();

alter table public.lists enable row level security;

create table public.list_leads (
  list_id    uuid not null references public.lists(id) on delete cascade,
  lead_id    uuid not null references public.leads(id) on delete cascade,
  position   integer,
  added_at   timestamptz not null default now(),
  primary key (list_id, lead_id)
);

create index list_leads_lead_idx on public.list_leads(lead_id);

alter table public.list_leads enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- exports
-- ─────────────────────────────────────────────────────────────────────────────
create table public.exports (
  id              uuid primary key default uuid_generate_v4(),
  account_id      uuid not null references public.accounts(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  source_kind     text not null check (source_kind in ('search', 'list')),
  source_id       uuid not null,
  type            export_type not null,
  target          text,                              -- e.g. webhook URL, instantly campaign name
  status          export_status not null default 'pending',
  status_reason   text,
  lead_count      integer not null default 0,
  file_path       text,                              -- supabase storage object path
  file_size_bytes bigint,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index exports_account_idx on public.exports(account_id, created_at desc);
create index exports_source_idx on public.exports(source_kind, source_id);

create trigger exports_set_updated_at
before update on public.exports
for each row execute function public.set_updated_at();

alter table public.exports enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- integrations
-- ─────────────────────────────────────────────────────────────────────────────
create table public.integrations (
  id                       uuid primary key default uuid_generate_v4(),
  account_id               uuid not null references public.accounts(id) on delete cascade,
  kind                     integration_kind not null,
  name                     text,
  encrypted_credentials    text,                     -- ciphertext (envelope-encrypted)
  settings                 jsonb not null default '{}'::jsonb,
  active                   boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (account_id, kind, name)
);

create trigger integrations_set_updated_at
before update on public.integrations
for each row execute function public.set_updated_at();

alter table public.integrations enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- usage_events
-- ─────────────────────────────────────────────────────────────────────────────
create table public.usage_events (
  id           uuid primary key default uuid_generate_v4(),
  account_id   uuid not null references public.accounts(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  kind         text not null,                        -- e.g. 'search_created', 'export_started'
  ref_id       uuid,
  payload      jsonb,
  cost_usd     numeric(10, 6),                       -- COGS per event (Apify CU + Anthropic tokens + email validate)
  created_at   timestamptz not null default now()
);

create index usage_events_account_kind_idx on public.usage_events(account_id, kind, created_at desc);

alter table public.usage_events enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- New-user trigger: auto-create personal account + grant signup credits
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
  v_name       text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  insert into public.accounts (name)
  values (v_name)
  returning id into v_account_id;

  insert into public.account_members (account_id, user_id, role)
  values (v_account_id, new.id, 'owner');

  insert into public.subscriptions (account_id, plan, status)
  values (v_account_id, 'free', 'active');

  insert into public.credit_ledger (account_id, delta, reason, metadata)
  values (
    v_account_id,
    100,
    'signup_grant',
    jsonb_build_object('source', 'auto_provision')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS policies
--
-- Pattern:
--   SELECT — caller is a member of the row's account
--   INSERT/UPDATE/DELETE — caller is owner or admin of the row's account
-- ─────────────────────────────────────────────────────────────────────────────

-- accounts
create policy "accounts: members can read"
  on public.accounts for select
  using (public.is_account_member(id));

create policy "accounts: owners/admins can update"
  on public.accounts for update
  using (
    exists (
      select 1 from public.account_members
      where account_id = accounts.id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  );

-- account_members
create policy "members: members can read"
  on public.account_members for select
  using (public.is_account_member(account_id));

create policy "members: owners can manage"
  on public.account_members for all
  using (
    exists (
      select 1 from public.account_members am
      where am.account_id = account_members.account_id
        and am.user_id = (select auth.uid())
        and am.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from public.account_members am
      where am.account_id = account_members.account_id
        and am.user_id = (select auth.uid())
        and am.role = 'owner'
    )
  );

-- api_keys
create policy "api_keys: members can read"
  on public.api_keys for select
  using (public.is_account_member(account_id));

create policy "api_keys: owners/admins can manage"
  on public.api_keys for all
  using (
    exists (
      select 1 from public.account_members
      where account_id = api_keys.account_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.account_members
      where account_id = api_keys.account_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  );

-- subscriptions (read-only for users; writes via service role only)
create policy "subscriptions: members can read"
  on public.subscriptions for select
  using (public.is_account_member(account_id));

-- credit_ledger (read-only for users; service role writes)
create policy "credit_ledger: members can read"
  on public.credit_ledger for select
  using (public.is_account_member(account_id));

-- searches
create policy "searches: members can read"
  on public.searches for select
  using (public.is_account_member(account_id));

create policy "searches: members can insert"
  on public.searches for insert
  with check (public.is_account_member(account_id) and user_id = (select auth.uid()));

create policy "searches: owners/admins can update"
  on public.searches for update
  using (
    exists (
      select 1 from public.account_members
      where account_id = searches.account_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  );

create policy "searches: owners/admins can delete"
  on public.searches for delete
  using (
    exists (
      select 1 from public.account_members
      where account_id = searches.account_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  );

-- leads
create policy "leads: members can read"
  on public.leads for select
  using (public.is_account_member(account_id));

create policy "leads: members can write"
  on public.leads for all
  using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- lists
create policy "lists: members can read"
  on public.lists for select
  using (public.is_account_member(account_id));

create policy "lists: members can write"
  on public.lists for all
  using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));

-- list_leads
create policy "list_leads: members can read"
  on public.list_leads for select
  using (
    exists (
      select 1 from public.lists
      where lists.id = list_leads.list_id
        and public.is_account_member(lists.account_id)
    )
  );

create policy "list_leads: members can write"
  on public.list_leads for all
  using (
    exists (
      select 1 from public.lists
      where lists.id = list_leads.list_id
        and public.is_account_member(lists.account_id)
    )
  )
  with check (
    exists (
      select 1 from public.lists
      where lists.id = list_leads.list_id
        and public.is_account_member(lists.account_id)
    )
  );

-- exports
create policy "exports: members can read"
  on public.exports for select
  using (public.is_account_member(account_id));

create policy "exports: members can insert"
  on public.exports for insert
  with check (public.is_account_member(account_id) and user_id = (select auth.uid()));

create policy "exports: owners/admins can delete"
  on public.exports for delete
  using (
    exists (
      select 1 from public.account_members
      where account_id = exports.account_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  );

-- integrations
create policy "integrations: members can read"
  on public.integrations for select
  using (public.is_account_member(account_id));

create policy "integrations: owners/admins can write"
  on public.integrations for all
  using (
    exists (
      select 1 from public.account_members
      where account_id = integrations.account_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.account_members
      where account_id = integrations.account_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
    )
  );

-- usage_events (read-only for users)
create policy "usage_events: members can read"
  on public.usage_events for select
  using (public.is_account_member(account_id));
