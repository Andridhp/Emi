-- Versioned clinical rule catalog. Generative models never write, approve or publish rules.

create table public.clinical_rule_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version text not null,
  title text not null,
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft','in_review','approved','published','retired','suspended')),
  countries text[] not null default '{}',
  languages text[] not null default '{es}',
  valid_from timestamptz,
  valid_until timestamptz,
  published_at timestamptz,
  supersedes uuid references public.clinical_rule_sets(id),
  evidence_summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code, version),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table public.clinical_rules (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.clinical_rule_sets(id) on delete cascade,
  stable_code text not null,
  stage text not null check (stage in ('preconception','pregnancy','postpartum','newborn','infant','child')),
  level text not null check (level in ('expected','observe','consult','urgent')),
  input_schema jsonb not null,
  condition_schema jsonb not null,
  presentation jsonb not null,
  source_name text not null,
  source_url text not null check (source_url ~ '^https://'),
  source_published_on date,
  evidence_excerpt text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (rule_set_id, stable_code),
  check (jsonb_typeof(input_schema) = 'object'),
  check (jsonb_typeof(condition_schema) = 'object'),
  check (jsonb_typeof(presentation) = 'object')
);

create table public.clinical_rule_reviews (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.clinical_rule_sets(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id),
  reviewer_role text not null,
  jurisdiction text not null,
  decision text not null check (decision in ('approved','changes_requested','rejected')),
  checklist_version text not null,
  notes text,
  reviewed_at timestamptz not null default now(),
  unique (rule_set_id, reviewer_user_id)
);

create table public.clinical_rule_publications (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.clinical_rule_sets(id),
  action text not null check (action in ('published','suspended','retired')),
  actor_user_id uuid references auth.users(id),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.clinical_rule_sets enable row level security;
alter table public.clinical_rules enable row level security;
alter table public.clinical_rule_reviews enable row level security;
alter table public.clinical_rule_publications enable row level security;

-- Only currently published catalog content is visible to the application.
create policy "read current published rule sets" on public.clinical_rule_sets for select
using (
  lifecycle_status = 'published'
  and (valid_from is null or valid_from <= now())
  and (valid_until is null or valid_until > now())
);

create policy "read rules from current published sets" on public.clinical_rules for select
using (enabled and exists (
  select 1 from public.clinical_rule_sets s
  where s.id = rule_set_id
    and s.lifecycle_status = 'published'
    and (s.valid_from is null or s.valid_from <= now())
    and (s.valid_until is null or s.valid_until > now())
));

-- Reviews and publication history are server/admin-only; they may contain identities or internal notes.
-- No client INSERT/UPDATE/DELETE policies exist for any catalog table.

create or replace function public.publish_clinical_rule_set(target_rule_set uuid, publication_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  approved_count integer;
  enabled_count integer;
  current_status text;
begin
  select lifecycle_status into current_status
  from public.clinical_rule_sets where id = target_rule_set for update;

  if current_status is null then raise exception 'rule_set_not_found'; end if;
  if current_status not in ('in_review','approved') then raise exception 'invalid_lifecycle_transition'; end if;
  if nullif(trim(publication_reason), '') is null then raise exception 'publication_reason_required'; end if;

  select count(distinct reviewer_user_id) into approved_count
  from public.clinical_rule_reviews
  where rule_set_id = target_rule_set and decision = 'approved';

  if approved_count < 2 then raise exception 'two_independent_approvals_required'; end if;
  if exists (select 1 from public.clinical_rule_reviews where rule_set_id = target_rule_set and decision in ('rejected','changes_requested')) then
    raise exception 'unresolved_review_decision';
  end if;

  select count(*) into enabled_count from public.clinical_rules
  where rule_set_id = target_rule_set and enabled;
  if enabled_count = 0 then raise exception 'enabled_rule_required'; end if;

  update public.clinical_rule_sets
  set lifecycle_status = 'published', published_at = now(), updated_at = now(),
      valid_from = coalesce(valid_from, now())
  where id = target_rule_set;

  insert into public.clinical_rule_publications(rule_set_id, action, actor_user_id, reason)
  values (target_rule_set, 'published', auth.uid(), publication_reason);
end;
$$;

create or replace function public.suspend_clinical_rule_set(target_rule_set uuid, suspension_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if nullif(trim(suspension_reason), '') is null then raise exception 'suspension_reason_required'; end if;
  update public.clinical_rule_sets set lifecycle_status = 'suspended', updated_at = now()
  where id = target_rule_set and lifecycle_status = 'published';
  if not found then raise exception 'published_rule_set_not_found'; end if;
  insert into public.clinical_rule_publications(rule_set_id, action, actor_user_id, reason)
  values (target_rule_set, 'suspended', auth.uid(), suspension_reason);
end;
$$;

revoke all on function public.publish_clinical_rule_set(uuid, text) from public;
revoke all on function public.suspend_clinical_rule_set(uuid, text) from public;
grant execute on function public.publish_clinical_rule_set(uuid, text) to service_role;
grant execute on function public.suspend_clinical_rule_set(uuid, text) to service_role;

comment on table public.clinical_rule_sets is 'Immutable-by-version clinical catalog releases scoped by country, language and validity.';
comment on table public.clinical_rules is 'Structured deterministic rules; no generative output or executable SQL belongs in condition_schema.';
comment on table public.clinical_rule_reviews is 'Independent professional review decisions, hidden from family clients.';
comment on function public.publish_clinical_rule_set(uuid, text) is 'Server-only guarded transition requiring two independent approvals and no unresolved objections.';
