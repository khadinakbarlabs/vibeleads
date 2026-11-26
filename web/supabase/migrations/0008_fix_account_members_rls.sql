-- Fix infinite-recursion (42P17) in account_members RLS.
-- Original SELECT policy called is_account_member() which queries
-- account_members, which re-triggered the SELECT policy. The function
-- is SECURITY DEFINER but Postgres still flags this as recursion.
--
-- Replace with a direct user_id check: each user can only see their own
-- membership rows. For v1 (one account per user, no team UI), this is
-- functionally equivalent to the previous policy. Team-management writes
-- happen via the service role / handle_new_user trigger.

drop policy if exists "members: members can read" on public.account_members;
drop policy if exists "members: owners can manage" on public.account_members;

create policy "account_members: read own"
  on public.account_members for select
  using (user_id = (select auth.uid()));

-- No write policies — writes happen through the on_auth_user_created
-- trigger (handle_new_user uses elevated SECURITY DEFINER) and via the
-- service-role client in admin contexts. Authed users cannot directly
-- INSERT/UPDATE/DELETE membership rows.
