-- View: how many credits an account has spent today (negative delta rows).
-- Used by the settings page / LimitsCard to show today's spend and
-- warn when approaching the daily_credit_cap.
create or replace view public.account_today_spend as
  select
    account_id,
    coalesce(sum(-delta), 0)::bigint as credits_spent_today
  from public.credit_ledger
  where
    delta < 0
    and created_at >= (now() at time zone 'UTC')::date
  group by account_id;

-- Grant read access to authenticated users (RLS handles row-level filtering
-- because credit_ledger already has a members-only select policy, and this
-- view queries it).
grant select on public.account_today_spend to authenticated;
