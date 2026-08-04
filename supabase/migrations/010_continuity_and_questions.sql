-- Continuity records and consultation questions shared across authorized devices.

create table public.birth_records (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}',
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.postpartum_records (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}',
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.consultation_questions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null,
  question_text text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (profile_id, client_id)
);

create index consultation_questions_profile_created_idx
  on public.consultation_questions(profile_id, created_at desc);

alter table public.birth_records enable row level security;
alter table public.postpartum_records enable row level security;
alter table public.consultation_questions enable row level security;

create policy "profile viewers read birth records" on public.birth_records for select
using (public.can_access_profile(profile_id, 'viewer'));
create policy "profile editors create birth records" on public.birth_records for insert
with check (public.can_access_profile(profile_id, 'editor') and updated_by = auth.uid());
create policy "profile editors update birth records" on public.birth_records for update
using (public.can_access_profile(profile_id, 'editor'))
with check (public.can_access_profile(profile_id, 'editor'));

create policy "profile viewers read postpartum records" on public.postpartum_records for select
using (public.can_access_profile(profile_id, 'viewer'));
create policy "profile editors create postpartum records" on public.postpartum_records for insert
with check (public.can_access_profile(profile_id, 'editor') and updated_by = auth.uid());
create policy "profile editors update postpartum records" on public.postpartum_records for update
using (public.can_access_profile(profile_id, 'editor'))
with check (public.can_access_profile(profile_id, 'editor'));

create policy "profile viewers read consultation questions" on public.consultation_questions for select
using (public.can_access_profile(profile_id, 'viewer'));
create policy "profile editors create consultation questions" on public.consultation_questions for insert
with check (public.can_access_profile(profile_id, 'editor') and created_by = auth.uid());
create policy "authors or managers update consultation questions" on public.consultation_questions for update
using (created_by = auth.uid() or public.can_access_profile(profile_id, 'manager'))
with check (public.can_access_profile(profile_id, 'editor'));
create policy "authors or managers delete consultation questions" on public.consultation_questions for delete
using (created_by = auth.uid() or public.can_access_profile(profile_id, 'manager'));

create or replace function public.upsert_prenatal_record_for_current_user(
  profile_client_id text,
  record_payload jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare target_profile public.profiles%rowtype;
begin
  select * into target_profile from public.profiles p
  where p.client_id = profile_client_id and p.kind = 'pregnancy'
    and public.can_access_profile(p.id, 'editor') limit 1;
  if target_profile.id is null then raise exception 'profile unavailable'; end if;
  if jsonb_typeof(record_payload) <> 'object' or octet_length(record_payload::text) > 20000 then
    raise exception 'invalid prenatal record';
  end if;

  insert into public.pregnancies(
    profile_id, last_menstrual_period, due_date, due_date_confirmed_by,
    folic_acid_started_on, folic_acid_dose, history, complications
  ) values (
    target_profile.id,
    nullif(record_payload->>'lastMenstrualPeriod', '')::date,
    nullif(record_payload->>'dueDate', '')::date,
    nullif(left(record_payload->>'dueDateConfirmedBy', 500), ''),
    nullif(record_payload->>'folicAcidStarted', '')::date,
    nullif(left(record_payload->>'folicAcidDose', 500), ''),
    record_payload - array['profileId','lastMenstrualPeriod','dueDate','dueDateConfirmedBy','folicAcidStarted','folicAcidDose','complications'],
    case when record_payload ? 'complications' then to_jsonb(record_payload->>'complications') else '[]'::jsonb end
  )
  on conflict (profile_id) do update set
    last_menstrual_period = excluded.last_menstrual_period,
    due_date = excluded.due_date,
    due_date_confirmed_by = excluded.due_date_confirmed_by,
    folic_acid_started_on = excluded.folic_acid_started_on,
    folic_acid_dose = excluded.folic_acid_dose,
    history = excluded.history,
    complications = excluded.complications;

  update public.profiles set due_date = nullif(record_payload->>'dueDate', '')::date
  where id = target_profile.id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_profile.family_id, auth.uid(), 'prenatal_record.synced', 'pregnancy', target_profile.id);
  return true;
end;
$$;

create or replace function public.upsert_birth_record_for_current_user(
  profile_client_id text,
  record_payload jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare target_profile public.profiles%rowtype;
begin
  select * into target_profile from public.profiles p
  where p.client_id = profile_client_id and public.can_access_profile(p.id, 'editor') limit 1;
  if target_profile.id is null then raise exception 'profile unavailable'; end if;
  if jsonb_typeof(record_payload) <> 'object' or octet_length(record_payload::text) > 20000 then
    raise exception 'invalid birth record';
  end if;
  insert into public.birth_records(profile_id, payload, updated_by, updated_at)
  values (target_profile.id, record_payload - 'profileId', auth.uid(), now())
  on conflict (profile_id) do update set payload = excluded.payload, updated_by = auth.uid(), updated_at = now();
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_profile.family_id, auth.uid(), 'birth_record.synced', 'birth_record', target_profile.id);
  return true;
end;
$$;

create or replace function public.upsert_postpartum_record_for_current_user(
  profile_client_id text,
  record_payload jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare target_profile public.profiles%rowtype;
begin
  select * into target_profile from public.profiles p
  where p.client_id = profile_client_id and public.can_access_profile(p.id, 'editor') limit 1;
  if target_profile.id is null then raise exception 'profile unavailable'; end if;
  if jsonb_typeof(record_payload) <> 'object' or octet_length(record_payload::text) > 20000 then
    raise exception 'invalid postpartum record';
  end if;
  insert into public.postpartum_records(profile_id, payload, updated_by, updated_at)
  values (target_profile.id, record_payload - 'profileId', auth.uid(), now())
  on conflict (profile_id) do update set payload = excluded.payload, updated_by = auth.uid(), updated_at = now();
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_profile.family_id, auth.uid(), 'postpartum_record.synced', 'postpartum_record', target_profile.id);
  return true;
end;
$$;

create or replace function public.upsert_consultation_question_for_current_user(
  profile_client_id text,
  question_client_id text,
  target_question_text text,
  target_created_at timestamptz,
  target_resolved_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare target_profile public.profiles%rowtype; target_question_id uuid; existing_creator uuid;
begin
  select * into target_profile from public.profiles p
  where p.client_id = profile_client_id and public.can_access_profile(p.id, 'editor') limit 1;
  if target_profile.id is null then raise exception 'profile unavailable'; end if;
  if nullif(trim(question_client_id), '') is null or nullif(trim(target_question_text), '') is null
    or char_length(trim(target_question_text)) > 500 then raise exception 'invalid question'; end if;

  select created_by into existing_creator from public.consultation_questions
  where profile_id = target_profile.id and client_id = question_client_id;
  if existing_creator is not null and existing_creator <> auth.uid()
    and not public.can_access_profile(target_profile.id, 'manager') then
    raise exception 'question unavailable';
  end if;

  insert into public.consultation_questions(profile_id, client_id, question_text, created_by, created_at, resolved_at)
  values (target_profile.id, question_client_id, trim(target_question_text), auth.uid(), target_created_at, target_resolved_at)
  on conflict (profile_id, client_id) do update set
    question_text = excluded.question_text, resolved_at = excluded.resolved_at
  returning id into target_question_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_profile.family_id, auth.uid(), 'consultation_question.synced', 'consultation_question', target_question_id);
  return target_question_id;
end;
$$;

create or replace function public.delete_consultation_question_for_current_user(question_client_id text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare target_question public.consultation_questions%rowtype; target_family uuid;
begin
  select q.* into target_question from public.consultation_questions q
  where q.client_id = question_client_id
    and (q.created_by = auth.uid() or public.can_access_profile(q.profile_id, 'manager'))
  limit 1;
  if target_question.id is null then return false; end if;
  select family_id into target_family from public.profiles where id = target_question.profile_id;
  delete from public.consultation_questions where id = target_question.id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'consultation_question.deleted', 'consultation_question', target_question.id);
  return true;
end;
$$;

revoke all on function public.upsert_prenatal_record_for_current_user(text,jsonb) from public;
revoke all on function public.upsert_birth_record_for_current_user(text,jsonb) from public;
revoke all on function public.upsert_postpartum_record_for_current_user(text,jsonb) from public;
revoke all on function public.upsert_consultation_question_for_current_user(text,text,text,timestamptz,timestamptz) from public;
revoke all on function public.delete_consultation_question_for_current_user(text) from public;
grant execute on function public.upsert_prenatal_record_for_current_user(text,jsonb) to authenticated;
grant execute on function public.upsert_birth_record_for_current_user(text,jsonb) to authenticated;
grant execute on function public.upsert_postpartum_record_for_current_user(text,jsonb) to authenticated;
grant execute on function public.upsert_consultation_question_for_current_user(text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.delete_consultation_question_for_current_user(text) to authenticated;

comment on table public.birth_records is 'Structured family-entered birth continuity record; not a diagnosis.';
comment on table public.postpartum_records is 'Structured family-entered postpartum continuity record; not a diagnosis.';
comment on table public.consultation_questions is 'Questions prepared by caregivers for their health professional.';
