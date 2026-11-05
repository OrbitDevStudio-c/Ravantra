-- =====================================================================
-- RAVANTRA — Supabase Storage bucket for catalogue & brand media
-- Public read; uploads restricted to staff with the right permission.
-- Size/MIME limits are enforced by the bucket and again on the server.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "media staff write" on storage.objects;
create policy "media staff write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (public.has_permission('products.manage') or public.has_permission('divisions.manage')
         or public.has_permission('marketing.manage') or public.has_permission('appointments.manage'))
  );

drop policy if exists "media staff update" on storage.objects;
create policy "media staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff())
  with check (bucket_id = 'media' and public.is_staff());

drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (public.has_permission('products.manage') or public.has_permission('divisions.manage')));
