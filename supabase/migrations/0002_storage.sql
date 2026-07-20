-- Detention Recover AI — Storage buckets for proof documents.
--
-- Two public-read buckets (files are served by unguessable UUID paths):
--   documents    — admin-uploaded evidence (rate cons, BOL, POD, invoices)
--   lead-uploads — proof attached by customers on the public landing form
--
-- Public read keeps the client simple (stable getPublicUrl links). If you need
-- stricter privacy later, flip `public` to false and switch the client to
-- signed URLs.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('lead-uploads', 'lead-uploads', true)
on conflict (id) do nothing;

-- Upload (insert) policies. Public read is handled by the public bucket CDN.
drop policy if exists "documents_insert_auth" on storage.objects;
drop policy if exists "documents_read_auth" on storage.objects;
drop policy if exists "leaduploads_insert_any" on storage.objects;

-- Only the authenticated admin can upload into the documents bucket.
create policy "documents_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');

create policy "documents_read_auth"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

-- Anyone (including anonymous landing visitors) may upload proof to
-- lead-uploads, but cannot list/read others' files via the API.
create policy "leaduploads_insert_any"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'lead-uploads');
