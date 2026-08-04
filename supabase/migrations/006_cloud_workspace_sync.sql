-- Stable client identifiers make offline-first synchronization idempotent.
alter table public.profiles add column if not exists client_id text;
alter table public.events add column if not exists client_id text;

create unique index if not exists profiles_family_client_id_idx
  on public.profiles(family_id, client_id) where client_id is not null;
create unique index if not exists events_profile_client_id_idx
  on public.events(profile_id, client_id) where client_id is not null;
create unique index if not exists consents_current_version_idx
  on public.consents(family_id, user_id, purpose, policy_version);

create or replace function public.upsert_profile_for_current_user(
  target_family uuid,
  local_client_id text,
  profile_kind text,
  profile_name text,
  profile_birth_date date default null,
  profile_due_date date default null,
  profile_gestational_weeks smallint default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare target_id uuid;
begin
  if not public.is_family_owner(target_family) then raise exception 'insufficient profile access'; end if;
  if nullif(trim(local_client_id), '') is null or nullif(trim(profile_name), '') is null then raise exception 'invalid profile'; end if;
  if profile_kind not in ('pregnancy', 'child') then raise exception 'invalid profile kind'; end if;

  insert into public.profiles(family_id, client_id, kind, display_name, birth_date, due_date, gestational_weeks)
  values (target_family, local_client_id, profile_kind, trim(profile_name), profile_birth_date, profile_due_date, profile_gestational_weeks)
  on conflict (family_id, client_id) where client_id is not null do update set
    kind = excluded.kind, display_name = excluded.display_name, birth_date = excluded.birth_date,
    due_date = excluded.due_date, gestational_weeks = excluded.gestational_weeks
  returning id into target_id;

  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'profile.synced', 'profile', target_id);
  return target_id;
end;
$$;

create or replace function public.upsert_event_for_current_user(
  profile_client_id text,
  event_client_id text,
  target_event_type text,
  target_occurred_at timestamptz,
  target_source public.data_source,
  target_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare target_profile_id uuid; target_family_id uuid; target_event_id uuid;
begin
  select id, family_id into target_profile_id, target_family_id
  from public.profiles where client_id = profile_client_id and public.can_access_profile(id, 'editor') limit 1;
  if target_profile_id is null then raise exception 'profile unavailable'; end if;
  if target_source not in ('parent', 'professional') then raise exception 'client source not allowed'; end if;

  insert into public.events(profile_id, client_id, event_type, occurred_at, payload, source, created_by)
  values (target_profile_id, event_client_id, target_event_type, target_occurred_at, coalesce(target_payload, '{}'), target_source, auth.uid())
  on conflict (profile_id, client_id) where client_id is not null do update set
    event_type = excluded.event_type, occurred_at = excluded.occurred_at, payload = excluded.payload,
    source = excluded.source
  returning id into target_event_id;

  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family_id, auth.uid(), 'event.synced', 'event', target_event_id);
  return target_event_id;
end;
$$;

create or replace function public.delete_event_for_current_user(event_client_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare target_event public.events%rowtype; target_family_id uuid;
begin
  select e.* into target_event from public.events e
  where e.client_id = event_client_id
    and (e.created_by = auth.uid() or public.can_access_profile(e.profile_id, 'manager'))
  limit 1;
  if target_event.id is null then return false; end if;
  select family_id into target_family_id from public.profiles where id = target_event.profile_id;
  delete from public.events where id = target_event.id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family_id, auth.uid(), 'event.deleted', 'event', target_event.id);
  return true;
end;
$$;

revoke all on function public.upsert_profile_for_current_user(uuid,text,text,text,date,date,smallint) from public;
revoke all on function public.upsert_event_for_current_user(text,text,text,timestamptz,public.data_source,jsonb) from public;
revoke all on function public.delete_event_for_current_user(text) from public;
grant execute on function public.upsert_profile_for_current_user(uuid,text,text,text,date,date,smallint) to authenticated;
grant execute on function public.upsert_event_for_current_user(text,text,text,timestamptz,public.data_source,jsonb) to authenticated;
grant execute on function public.delete_event_for_current_user(text) to authenticated;
