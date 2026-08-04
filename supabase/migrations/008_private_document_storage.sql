alter table public.documents add column if not exists client_id text;
alter table public.documents add column if not exists size_bytes bigint;
alter table public.documents add column if not exists upload_status text not null default 'uploaded'
  check (upload_status in ('pending','uploaded','failed'));
alter table public.documents alter column sha256 drop not null;

create unique index if not exists documents_profile_client_id_idx
  on public.documents(profile_id, client_id) where client_id is not null;

create or replace function public.prepare_private_document_upload(
  profile_client_id text,
  document_client_id text,
  target_file_name text,
  target_mime_type text,
  target_size_bytes bigint,
  target_category text,
  target_document_date date
) returns table(document_id uuid, object_path text)
language plpgsql security definer set search_path = public as $$
declare target_profile public.profiles%rowtype; new_document uuid; new_path text; extension text;
begin
  select * into target_profile from public.profiles p
  where p.client_id = profile_client_id and public.can_access_profile(p.id, 'editor') limit 1;
  if target_profile.id is null then raise exception 'profile unavailable'; end if;
  if target_mime_type not in ('application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif') then raise exception 'unsupported file type'; end if;
  if target_size_bytes is null or target_size_bytes < 1 or target_size_bytes > 8388608 then raise exception 'invalid file size'; end if;
  extension := case target_mime_type when 'application/pdf' then '.pdf' when 'image/jpeg' then '.jpg' when 'image/png' then '.png' when 'image/webp' then '.webp' when 'image/heic' then '.heic' when 'image/heif' then '.heif' else '' end;

  insert into public.documents(profile_id, client_id, storage_path, file_name, mime_type, sha256, category, document_date, extraction_status, upload_status, size_bytes, uploaded_by)
  values (target_profile.id, document_client_id, 'pending', left(target_file_name, 240), target_mime_type, null, target_category,
    target_document_date, 'pending', 'pending', target_size_bytes, auth.uid())
  on conflict (profile_id, client_id) where client_id is not null do update set
    file_name = excluded.file_name, mime_type = excluded.mime_type, category = excluded.category,
    document_date = excluded.document_date, size_bytes = excluded.size_bytes, upload_status = 'pending'
  returning id into new_document;
  new_path := target_profile.family_id::text || '/' || target_profile.id::text || '/' || new_document::text || extension;
  update public.documents set storage_path = new_path where id = new_document;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_profile.family_id, auth.uid(), 'document.upload_prepared', 'document', new_document);
  return query select new_document, new_path;
end;
$$;

create or replace function public.finalize_private_document_upload(target_document uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare target public.documents%rowtype; target_family uuid;
begin
  select * into target from public.documents d where d.id = target_document and d.uploaded_by = auth.uid() limit 1;
  if target.id is null then raise exception 'document unavailable'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id = 'medical-documents' and o.name = target.storage_path) then raise exception 'object missing'; end if;
  update public.documents set upload_status = 'uploaded' where id = target.id;
  select family_id into target_family from public.profiles where id = target.profile_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'document.uploaded', 'document', target.id);
  return true;
end;
$$;

create or replace function public.delete_private_document_record(target_document uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare target public.documents%rowtype; target_family uuid; removed_count integer;
begin
  select * into target from public.documents d where d.id = target_document
    and (d.uploaded_by = auth.uid() or public.can_access_profile(d.profile_id, 'manager')) limit 1;
  if target.id is null then raise exception 'document unavailable'; end if;
  select family_id into target_family from public.profiles where id = target.profile_id;
  delete from public.documents where id = target.id;
  get diagnostics removed_count = row_count;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'document.deleted', 'document', target.id);
  return removed_count > 0;
end;
$$;

create or replace function public.confirm_document_facts(target_document uuid, confirmations jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare target_profile uuid; target_family uuid; item jsonb; confirmed_count integer := 0;
begin
  select d.profile_id, p.family_id into target_profile, target_family
  from public.documents d join public.profiles p on p.id = d.profile_id where d.id = target_document;
  if target_profile is null or not public.can_access_profile(target_profile, 'editor') then raise exception 'document unavailable'; end if;
  if jsonb_typeof(confirmations) <> 'array' then raise exception 'invalid confirmations'; end if;
  for item in select * from jsonb_array_elements(confirmations) loop
    if coalesce((item->>'selected')::boolean, false) and nullif(trim(item->>'value'), '') is not null then
      update public.extracted_facts set normalized_value = jsonb_build_object('value', trim(item->>'value')),
        confirmed_by = auth.uid(), confirmed_at = now()
      where id = (item->>'id')::uuid and document_id = target_document;
      if found then confirmed_count := confirmed_count + 1; end if;
    else
      update public.extracted_facts set confirmed_by = null, confirmed_at = null
      where id = (item->>'id')::uuid and document_id = target_document;
    end if;
  end loop;
  if confirmed_count < 1 then raise exception 'confirmed fact required'; end if;
  update public.documents set extraction_status = 'confirmed' where id = target_document;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'document.facts_confirmed', 'document', target_document);
  return confirmed_count;
end;
$$;

revoke all on function public.prepare_private_document_upload(text,text,text,text,bigint,text,date) from public;
revoke all on function public.finalize_private_document_upload(uuid) from public;
revoke all on function public.delete_private_document_record(uuid) from public;
revoke all on function public.confirm_document_facts(uuid,jsonb) from public;
grant execute on function public.prepare_private_document_upload(text,text,text,text,bigint,text,date) to authenticated;
grant execute on function public.finalize_private_document_upload(uuid) to authenticated;
grant execute on function public.delete_private_document_record(uuid) to authenticated;
grant execute on function public.confirm_document_facts(uuid,jsonb) to authenticated;
