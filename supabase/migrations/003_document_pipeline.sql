-- Server-side document processing queue. No model provider is called from the app.

create table public.document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  consent_id uuid not null references public.consents(id),
  status text not null default 'queued' check (status in ('queued','scanning','ocr','extracting','review','failed','cancelled')),
  attempt_count smallint not null default 0,
  failure_code text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create unique index one_active_document_job on public.document_processing_jobs(document_id)
where status in ('queued','scanning','ocr','extracting');

create table public.document_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.document_processing_jobs(id) on delete cascade,
  stage text not null check (stage in ('malware_scan','ocr','classification','extraction','summary')),
  processor_name text not null,
  processor_version text not null,
  schema_version text not null,
  input_sha256 text not null,
  output_sha256 text,
  status text not null check (status in ('started','completed','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_code text
);

alter table public.document_processing_jobs enable row level security;
alter table public.document_analysis_runs enable row level security;

-- Families may inspect status but cannot forge jobs or model-run metadata.
create policy "profile viewers read document jobs" on public.document_processing_jobs for select
using (exists (
  select 1 from public.documents d
  where d.id = document_id and public.can_access_profile(d.profile_id, 'viewer')
));
create policy "profile viewers read analysis provenance" on public.document_analysis_runs for select
using (exists (
  select 1 from public.document_processing_jobs j
  join public.documents d on d.id = j.document_id
  where j.id = job_id and public.can_access_profile(d.profile_id, 'viewer')
));

create or replace function public.request_document_processing(target_document uuid, consent_policy_version text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_profile uuid;
  active_consent uuid;
  new_job uuid;
begin
  select d.profile_id into target_profile from public.documents d where d.id = target_document;
  if target_profile is null or not public.can_access_profile(target_profile, 'editor') then
    raise exception 'document_not_accessible';
  end if;

  select c.id into active_consent
  from public.consents c
  join public.profiles p on p.family_id = c.family_id
  where p.id = target_profile
    and c.user_id = auth.uid()
    and c.purpose = 'document_analysis'
    and c.policy_version = consent_policy_version
    and c.revoked_at is null
  order by c.granted_at desc limit 1;

  if active_consent is null then raise exception 'active_consent_required'; end if;

  insert into public.document_processing_jobs(document_id, requested_by, consent_id)
  values (target_document, auth.uid(), active_consent)
  returning id into new_job;

  update public.documents set extraction_status = 'processing' where id = target_document;
  return new_job;
end;
$$;

revoke all on function public.request_document_processing(uuid, text) from public;
grant execute on function public.request_document_processing(uuid, text) to authenticated;

comment on table public.document_processing_jobs is 'Trusted worker queue. Clients request work only through request_document_processing().';
comment on table public.document_analysis_runs is 'Versioned, hash-linked provenance for every OCR/AI processing stage; no raw document text belongs here.';
