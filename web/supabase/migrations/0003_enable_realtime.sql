-- Add leads + searches to the supabase_realtime publication so the CRM
-- table can subscribe via Postgres logical replication.
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.searches;
