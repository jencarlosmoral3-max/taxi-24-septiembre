-- Vyro B-04: bucket privado de documentos de conductor. Ruta: <auth.uid()>/<nombre>.(jpg|jpeg|png|pdf),
-- la misma regla que el WITH CHECK de driver_documents.storage_path (B-02).
-- Sin políticas de UPDATE/DELETE: reemplazar un documento rechazado irá por RPC (service role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('driver-docs', 'driver-docs', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Solo un conductor con solicitud pendiente/rechazada puede subir (igual que driver_documents).
create function private.can_upload_driver_doc() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.drivers d
    where d.profile_id = (select auth.uid()) and d.status in ('pending', 'rejected'))
$$;
revoke all on function private.can_upload_driver_doc() from public, anon;
grant execute on function private.can_upload_driver_doc() to authenticated;

-- Tope de objetos por conductor (anti-abuso de almacenamiento).
create function private.my_driver_doc_object_count() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from storage.objects
  where bucket_id = 'driver-docs' and (storage.foldername(name))[1] = (select auth.uid())::text
$$;
revoke all on function private.my_driver_doc_object_count() from public, anon;
grant execute on function private.my_driver_doc_object_count() to authenticated;

create policy driver_docs_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'driver-docs'
    and name ~ ('^' || (select auth.uid())::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|pdf)$')
    and (select private.can_upload_driver_doc())
    and (select private.my_driver_doc_object_count()) < 20
  );

create policy driver_docs_select on storage.objects for select to authenticated
  using (
    bucket_id = 'driver-docs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
  );
