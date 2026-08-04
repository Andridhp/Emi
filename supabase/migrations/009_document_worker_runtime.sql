alter table public.document_processing_jobs add column if not exists worker_name text;
alter table public.document_processing_jobs add column if not exists lease_expires_at timestamptz;
alter table public.document_processing_jobs add column if not exists last_heartbeat_at timestamptz;

create or replace function public.claim_document_processing_job(target_worker text, lease_seconds integer default 120)
returns table(job_id uuid, document_id uuid, storage_path text, mime_type text, size_bytes bigint)
language plpgsql security definer set search_path = public as $$
declare claimed public.document_processing_jobs%rowtype;
begin
  if nullif(trim(target_worker), '') is null then raise exception 'worker name required'; end if;
  update public.document_processing_jobs j set status = 'failed', failure_code = 'lease_exhausted', completed_at = now()
  where j.status in ('scanning','ocr','extracting') and j.lease_expires_at < now() and j.attempt_count >= 3;
  update public.documents d set extraction_status = 'failed'
  where exists(select 1 from public.document_processing_jobs j where j.document_id = d.id and j.failure_code = 'lease_exhausted' and j.status = 'failed');
  update public.document_processing_jobs set status = 'queued', worker_name = null, lease_expires_at = null
  where status in ('scanning','ocr','extracting') and lease_expires_at < now() and attempt_count < 3;

  select * into claimed from public.document_processing_jobs
  where status = 'queued' order by queued_at for update skip locked limit 1;
  if claimed.id is null then return; end if;
  update public.document_processing_jobs set status = 'scanning', worker_name = trim(target_worker), attempt_count = attempt_count + 1,
    started_at = coalesce(started_at, now()), last_heartbeat_at = now(), lease_expires_at = now() + make_interval(secs => greatest(30, least(lease_seconds, 600)))
  where id = claimed.id;
  return query select claimed.id, d.id, d.storage_path, d.mime_type, d.size_bytes from public.documents d where d.id = claimed.document_id;
end;
$$;

create or replace function public.record_document_worker_stage(
  target_job uuid, target_worker text, target_stage text, target_processor text,
  target_processor_version text, target_schema_version text, target_input_sha256 text,
  target_output_sha256 text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_run uuid; next_status text;
begin
  if not exists(select 1 from public.document_processing_jobs where id = target_job and worker_name = target_worker and lease_expires_at > now()) then raise exception 'worker lease unavailable'; end if;
  if target_stage not in ('malware_scan','ocr','classification','extraction','summary') then raise exception 'invalid stage'; end if;
  insert into public.document_analysis_runs(job_id, stage, processor_name, processor_version, schema_version, input_sha256, output_sha256, status, completed_at)
  values (target_job, target_stage, left(target_processor, 120), left(target_processor_version, 80), left(target_schema_version, 40), target_input_sha256, target_output_sha256, 'completed', now())
  returning id into new_run;
  next_status := case target_stage when 'malware_scan' then 'ocr' when 'ocr' then 'extracting' else 'extracting' end;
  update public.document_processing_jobs set status = next_status, last_heartbeat_at = now(), lease_expires_at = now() + interval '2 minutes' where id = target_job;
  if target_stage = 'malware_scan' then
    update public.documents d set sha256 = target_input_sha256 from public.document_processing_jobs j where j.id = target_job and d.id = j.document_id;
  end if;
  return new_run;
end;
$$;

create or replace function public.complete_document_processing_job(
  target_job uuid, target_worker text, proposed_facts jsonb
) returns integer language plpgsql security definer set search_path = public as $$
declare target_document uuid; target_family uuid; item jsonb; inserted_count integer := 0;
begin
  select document_id into target_document from public.document_processing_jobs
  where id = target_job and worker_name = target_worker and lease_expires_at > now() for update;
  if target_document is null then raise exception 'worker lease unavailable'; end if;
  if jsonb_typeof(proposed_facts) <> 'array' or jsonb_array_length(proposed_facts) < 1 or jsonb_array_length(proposed_facts) > 100 then raise exception 'invalid facts'; end if;
  delete from public.extracted_facts where document_id = target_document and confirmed_at is null;
  for item in select * from jsonb_array_elements(proposed_facts) loop
    if nullif(trim(item->>'field_name'), '') is null or nullif(trim(item->>'raw_value'), '') is null then raise exception 'invalid fact'; end if;
    if length(item->>'field_name') > 80 or length(item->>'raw_value') > 500 then raise exception 'fact too large'; end if;
    if item->>'confidence' is null or (item->>'confidence')::numeric < 0 or (item->>'confidence')::numeric > 1 then raise exception 'invalid confidence'; end if;
    if item->>'page_number' is not null and ((item->>'page_number')::integer < 1 or (item->>'page_number')::integer > 10000) then raise exception 'invalid page'; end if;
    if item->'normalized_value' is not null and jsonb_typeof(item->'normalized_value') not in ('object','null') then raise exception 'invalid normalized value'; end if;
    insert into public.extracted_facts(document_id, field_name, raw_value, normalized_value, confidence, page_number, source)
    values (target_document, trim(item->>'field_name'), trim(item->>'raw_value'), item->'normalized_value', (item->>'confidence')::numeric,
      nullif(item->>'page_number','')::integer, 'document');
    inserted_count := inserted_count + 1;
  end loop;
  update public.document_processing_jobs set status = 'review', completed_at = now(), lease_expires_at = null, last_heartbeat_at = now() where id = target_job;
  update public.documents set extraction_status = 'review' where id = target_document;
  select p.family_id into target_family from public.documents d join public.profiles p on p.id = d.profile_id where d.id = target_document;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, null, 'document.proposals_ready', 'document', target_document);
  return inserted_count;
end;
$$;

create or replace function public.fail_document_processing_job(
  target_job uuid, target_worker text, target_failure_code text
) returns boolean language plpgsql security definer set search_path = public as $$
declare target_document uuid;
begin
  select document_id into target_document from public.document_processing_jobs where id = target_job and worker_name = target_worker for update;
  if target_document is null then raise exception 'job unavailable'; end if;
  update public.document_processing_jobs set status = 'failed', failure_code = left(coalesce(target_failure_code, 'worker_error'), 80), completed_at = now(), lease_expires_at = null where id = target_job;
  update public.documents set extraction_status = 'failed' where id = target_document;
  return true;
end;
$$;

revoke all on function public.claim_document_processing_job(text,integer) from public;
revoke all on function public.record_document_worker_stage(uuid,text,text,text,text,text,text,text) from public;
revoke all on function public.complete_document_processing_job(uuid,text,jsonb) from public;
revoke all on function public.fail_document_processing_job(uuid,text,text) from public;
grant execute on function public.claim_document_processing_job(text,integer) to service_role;
grant execute on function public.record_document_worker_stage(uuid,text,text,text,text,text,text,text) to service_role;
grant execute on function public.complete_document_processing_job(uuid,text,jsonb) to service_role;
grant execute on function public.fail_document_processing_job(uuid,text,text) to service_role;
