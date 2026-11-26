-- Verified native outreach screenshots contain submitted message content and
-- sender details. Keep them in a private bucket; only the authenticated app
-- route signs short-lived reads with the service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outreach-proofs',
  'outreach-proofs',
  false,
  5242880,
  array['image/png']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
