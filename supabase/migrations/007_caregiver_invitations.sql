create table public.member_directory (
  family_id uuid not null,
  user_id uuid not null,
  display_name text not null,
  relationship text not null default 'Cuidador familiar',
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  foreign key (family_id, user_id) references public.family_members(family_id, user_id) on delete cascade
);

alter table public.member_directory enable row level security;
alter table public.family_invitations add column if not exists invited_label text;
alter table public.family_invitations add column if not exists relationship text;
alter table public.family_invitations add column if not exists profile_access jsonb not null default '{}';

create policy "members read family directory" on public.member_directory for select
using (public.is_family_member(family_id));
create policy "users update own directory entry" on public.member_directory for update
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owners manage family directory" on public.member_directory for all
using (public.is_family_owner(family_id)) with check (public.is_family_owner(family_id));

create or replace function public.create_family_for_current_user(family_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_family_id uuid; display_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(trim(family_name), '') is null then raise exception 'family name required'; end if;
  select family_id into new_family_id from public.family_members where user_id = auth.uid() and role = 'owner' limit 1;
  if new_family_id is null then
    insert into public.families(name, created_by) values (trim(family_name), auth.uid()) returning id into new_family_id;
    insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
    values (new_family_id, auth.uid(), 'family.created', 'family', new_family_id);
  end if;
  display_name := coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'display_name'), ''), split_part(auth.jwt()->>'email', '@', 1), 'Mi cuenta');
  insert into public.member_directory(family_id, user_id, display_name, relationship)
  values (new_family_id, auth.uid(), display_name, 'Administrador familiar')
  on conflict (family_id, user_id) do update set display_name = excluded.display_name;
  return new_family_id;
end;
$$;

create or replace function public.create_caregiver_invitation(
  target_family uuid,
  invited_email text,
  invited_name text,
  invited_relationship text,
  requested_profile_access jsonb,
  validity_hours integer default 72
) returns table(invitation_id uuid, invitation_token text, invitation_expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare plain_token text; new_id uuid; expiry timestamptz;
begin
  if not public.is_family_owner(target_family) then raise exception 'owner access required'; end if;
  if nullif(trim(invited_email), '') is null then raise exception 'email required'; end if;
  plain_token := encode(gen_random_bytes(32), 'hex');
  expiry := now() + make_interval(hours => greatest(1, least(validity_hours, 168)));
  insert into public.family_invitations(family_id, invited_email_hash, invited_label, relationship, profile_access, token_hash, expires_at, invited_by)
  values (target_family, encode(digest(lower(trim(invited_email)), 'sha256'), 'hex'), nullif(trim(invited_name), ''),
    coalesce(nullif(trim(invited_relationship), ''), 'Cuidador familiar'), coalesce(requested_profile_access, '{}'),
    encode(digest(plain_token, 'sha256'), 'hex'), expiry, auth.uid()) returning id into new_id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'invitation.created', 'family_invitation', new_id);
  return query select new_id, plain_token, expiry;
end;
$$;

create or replace function public.accept_caregiver_invitation(invitation_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare invitation public.family_invitations%rowtype; pair record; target_profile uuid; account_email text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  account_email := lower(trim(auth.jwt()->>'email'));
  select * into invitation from public.family_invitations
  where token_hash = encode(digest(invitation_token, 'sha256'), 'hex') and status = 'pending' limit 1 for update;
  if invitation.id is null or invitation.expires_at <= now() then raise exception 'invitation unavailable'; end if;
  if invitation.invited_email_hash <> encode(digest(account_email, 'sha256'), 'hex') then raise exception 'invitation belongs to another account'; end if;

  insert into public.family_members(family_id, user_id, role, consented_at)
  values (invitation.family_id, auth.uid(), 'caregiver', now())
  on conflict (family_id, user_id) do update set role = 'caregiver', consented_at = now();
  insert into public.member_directory(family_id, user_id, display_name, relationship)
  values (invitation.family_id, auth.uid(), coalesce(invitation.invited_label, split_part(account_email, '@', 1)), coalesce(invitation.relationship, 'Cuidador familiar'))
  on conflict (family_id, user_id) do update set display_name = excluded.display_name, relationship = excluded.relationship;

  for pair in select * from jsonb_each_text(invitation.profile_access) loop
    select id into target_profile from public.profiles where family_id = invitation.family_id and client_id = pair.key;
    if target_profile is not null and pair.value in ('viewer','editor','manager') then
      insert into public.member_profile_access(family_id, user_id, profile_id, access_level, granted_by)
      values (invitation.family_id, auth.uid(), target_profile, pair.value::public.profile_access_level, invitation.invited_by)
      on conflict (user_id, profile_id) do update set access_level = excluded.access_level, granted_by = excluded.granted_by, granted_at = now();
    end if;
  end loop;
  update public.family_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = invitation.id;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (invitation.family_id, auth.uid(), 'invitation.accepted', 'family_invitation', invitation.id);
  return invitation.family_id;
end;
$$;

create or replace function public.set_caregiver_profile_access(
  target_family uuid, caregiver_user uuid, profile_client_id text, requested_access text
) returns boolean language plpgsql security definer set search_path = public as $$
declare target_profile uuid;
begin
  if not public.is_family_owner(target_family) then raise exception 'owner access required'; end if;
  if exists(select 1 from public.family_members where family_id = target_family and user_id = caregiver_user and role = 'owner') then raise exception 'owner access cannot be changed'; end if;
  select id into target_profile from public.profiles where family_id = target_family and client_id = profile_client_id;
  if target_profile is null then raise exception 'profile unavailable'; end if;
  if coalesce(requested_access, '') = '' then
    delete from public.member_profile_access where family_id = target_family and user_id = caregiver_user and profile_id = target_profile;
  elsif requested_access in ('viewer','editor','manager') then
    insert into public.member_profile_access(family_id, user_id, profile_id, access_level, granted_by)
    values (target_family, caregiver_user, target_profile, requested_access::public.profile_access_level, auth.uid())
    on conflict (user_id, profile_id) do update set access_level = excluded.access_level, granted_by = excluded.granted_by, granted_at = now();
  else raise exception 'invalid access level'; end if;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'profile_access.changed', 'profile', target_profile);
  return true;
end;
$$;

create or replace function public.remove_family_caregiver(target_family uuid, caregiver_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare removed_count integer;
begin
  if not public.is_family_owner(target_family) then raise exception 'owner access required'; end if;
  if exists(select 1 from public.family_members where family_id = target_family and user_id = caregiver_user and role = 'owner') then raise exception 'owner cannot be removed'; end if;
  delete from public.family_members where family_id = target_family and user_id = caregiver_user;
  get diagnostics removed_count = row_count;
  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (target_family, auth.uid(), 'caregiver.removed', 'family', target_family);
  return removed_count > 0;
end;
$$;

revoke all on function public.create_caregiver_invitation(uuid,text,text,text,jsonb,integer) from public;
revoke all on function public.accept_caregiver_invitation(text) from public;
revoke all on function public.set_caregiver_profile_access(uuid,uuid,text,text) from public;
revoke all on function public.remove_family_caregiver(uuid,uuid) from public;
grant execute on function public.create_caregiver_invitation(uuid,text,text,text,jsonb,integer) to authenticated;
grant execute on function public.accept_caregiver_invitation(text) to authenticated;
grant execute on function public.set_caregiver_profile_access(uuid,uuid,text,text) to authenticated;
grant execute on function public.remove_family_caregiver(uuid,uuid) to authenticated;
