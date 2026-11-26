-- Reusable sender / business profile.
--
-- Lets a user enter their outreach identity once instead of re-typing it
-- on every campaign. One row per account (unique account_id). The campaign
-- wizard auto-prefills from this, and it's the source for filling each
-- contact form's sender fields. AI fills any form-required field this
-- profile doesn't cover.
--
-- phone / company / website are NOT NULL to match the "nothing optional"
-- rule for outreach identity. linkedin + default_pitch are optional.

create table public.business_profiles (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid not null unique references public.accounts(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  sender_name   text not null,
  sender_email  text not null,
  sender_phone  text not null,
  company       text not null,
  website       text not null,
  linkedin      text,
  default_pitch text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index business_profiles_account_idx on public.business_profiles(account_id);

create trigger business_profiles_set_updated_at
before update on public.business_profiles
for each row execute function public.set_updated_at();

alter table public.business_profiles enable row level security;

create policy "business_profiles: members can read"
  on public.business_profiles for select
  using (public.is_account_member(account_id));

create policy "business_profiles: members can write"
  on public.business_profiles for all
  using (public.is_account_member(account_id))
  with check (public.is_account_member(account_id));
