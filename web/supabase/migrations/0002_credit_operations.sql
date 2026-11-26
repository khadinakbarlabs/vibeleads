-- Atomic credit spend: validates membership, locks per-account, checks balance.
create or replace function public.spend_credits(
  p_account_id uuid,
  p_amount int,
  p_reason ledger_reason,
  p_ref_kind text default null,
  p_ref_id uuid default null,
  p_metadata jsonb default null
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive' using errcode = 'P0001';
  end if;

  if not public.is_account_member(p_account_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('vl_credits:' || p_account_id::text));

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_ledger
  where account_id = p_account_id;

  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0002';
  end if;

  insert into public.credit_ledger (account_id, delta, reason, ref_kind, ref_id, metadata)
  values (p_account_id, -p_amount, p_reason, p_ref_kind, p_ref_id, p_metadata);

  return (v_balance - p_amount)::int;
end;
$$;

revoke execute on function public.spend_credits(uuid, int, ledger_reason, text, uuid, jsonb) from public, anon;

create or replace function public.grant_credits_admin(
  p_account_id uuid,
  p_amount int,
  p_reason ledger_reason,
  p_ref_kind text default null,
  p_ref_id uuid default null,
  p_metadata jsonb default null
)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v_balance bigint;
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('vl_credits:' || p_account_id::text));

  insert into public.credit_ledger (account_id, delta, reason, ref_kind, ref_id, metadata)
  values (p_account_id, p_amount, p_reason, p_ref_kind, p_ref_id, p_metadata);

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_ledger where account_id = p_account_id;

  return v_balance::int;
end;
$$;

revoke execute on function public.grant_credits_admin(uuid, int, ledger_reason, text, uuid, jsonb) from public, anon, authenticated;
