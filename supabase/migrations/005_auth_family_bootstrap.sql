-- Creates the first family atomically after an authenticated user accepts consent.
-- The function avoids temporarily exposing broad INSERT policies on family tables.
create or replace function public.create_family_for_current_user(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if nullif(trim(family_name), '') is null then raise exception 'family name required'; end if;

  select family_id into new_family_id
  from public.family_members
  where user_id = auth.uid() and role = 'owner'
  limit 1;

  if new_family_id is not null then return new_family_id; end if;

  insert into public.families(name, created_by)
  values (trim(family_name), auth.uid()) returning id into new_family_id;

  insert into public.audit_log(family_id, actor_id, action, resource_type, resource_id)
  values (new_family_id, auth.uid(), 'family.created', 'family', new_family_id);
  return new_family_id;
end;
$$;

revoke all on function public.create_family_for_current_user(text) from public;
grant execute on function public.create_family_for_current_user(text) to authenticated;

drop policy if exists "users insert own consent" on public.consents;
create policy "users insert own consent"
on public.consents for insert to authenticated
with check (user_id = auth.uid() and public.is_family_member(family_id));

drop policy if exists "users revoke own consent" on public.consents;
create policy "users revoke own consent"
on public.consents for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
