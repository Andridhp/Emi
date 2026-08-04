-- Metadata-only provenance for requested family summaries. No prompt, event text,
-- document text or model response is persisted in this table.

create table public.family_insight_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  consent_id uuid not null references public.consents(id),
  purpose text not null check (purpose in ('recent_summary','consultation_questions','document_changes')),
  provider text not null default 'openai',
  model text,
  prompt_version text not null,
  input_sha256 text,
  output_sha256 text,
  status text not null default 'queued' check (status in ('queued','completed','refused','failed')),
  failure_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index family_insight_runs_profile_created_idx on public.family_insight_runs(profile_id, created_at desc);
create index family_insight_runs_user_created_idx on public.family_insight_runs(requested_by, created_at desc);
alter table public.family_insight_runs enable row level security;

create policy "profile viewers read family insight provenance" on public.family_insight_runs for select
using (public.can_access_profile(profile_id, 'viewer'));

create or replace function public.prepare_family_insight_request(
  target_family uuid,
  profile_client_id text,
  requested_purpose text,
  consent_policy_version text
) returns table(run_id uuid, profile_id uuid, family_id uuid)
language plpgsql security definer set search_path = public as $$
declare target_profile public.profiles%rowtype; active_consent uuid; new_run uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if requested_purpose not in ('recent_summary','consultation_questions','document_changes') then raise exception 'invalid purpose'; end if;
  select * into target_profile from public.profiles p
  where p.family_id = target_family and p.client_id = profile_client_id
    and public.can_access_profile(p.id, 'viewer') limit 1;
  if target_profile.id is null then raise exception 'profile unavailable'; end if;

  select c.id into active_consent from public.consents c
  where c.family_id = target_family and c.user_id = auth.uid()
    and c.purpose = 'family_insights' and c.policy_version = consent_policy_version
    and c.revoked_at is null order by c.granted_at desc limit 1;
  if active_consent is null then raise exception 'active consent required'; end if;

  if (select count(*) from public.family_insight_runs r
      where r.requested_by = auth.uid() and r.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'request limit reached';
  end if;

  insert into public.family_insight_runs(profile_id, requested_by, consent_id, purpose, prompt_version)
  values (target_profile.id, auth.uid(), active_consent, requested_purpose, 'family-summary-es-v1')
  returning id into new_run;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'family_insight.requested', 'family_insight_run', new_run);
  return query select new_run, target_profile.id, target_profile.family_id;
end;
$$;

create or replace function public.complete_family_insight_request(
  target_run uuid,
  target_status text,
  target_model text,
  target_input_sha256 text,
  target_output_sha256 text default null,
  target_failure_code text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare target public.family_insight_runs%rowtype; target_family uuid;
begin
  if target_status not in ('completed','refused','failed') then raise exception 'invalid status'; end if;
  if target_input_sha256 is not null and target_input_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid input hash'; end if;
  if target_output_sha256 is not null and target_output_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'invalid output hash'; end if;
  select * into target from public.family_insight_runs where id = target_run and status = 'queued' for update;
  if target.id is null then raise exception 'run unavailable'; end if;
  update public.family_insight_runs set
    status = target_status,
    model = left(nullif(target_model, ''), 80),
    input_sha256 = target_input_sha256,
    output_sha256 = target_output_sha256,
    failure_code = left(nullif(target_failure_code, ''), 80),
    completed_at = now()
  where id = target_run;
  select family_id into target_family from public.profiles where id = target.profile_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, target.requested_by, 'family_insight.' || target_status, 'family_insight_run', target.id);
  return true;
end;
$$;

revoke all on function public.prepare_family_insight_request(uuid,text,text,text) from public;
revoke all on function public.complete_family_insight_request(uuid,text,text,text,text,text) from public;
grant execute on function public.prepare_family_insight_request(uuid,text,text,text) to authenticated;
grant execute on function public.complete_family_insight_request(uuid,text,text,text,text,text) to service_role;

comment on table public.family_insight_runs is 'Metadata-only AI provenance. Input and output content are intentionally never stored.';
