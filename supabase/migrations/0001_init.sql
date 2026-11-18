-- WardSense schema. Additive model: W = S+M+V+D+T, T = 3*adm + 3*dis + 2*pre + 2*transfer.
-- Isolation is NOT part of W; it is enforced by the safety engine.
-- SQL defaults below mirror src/config/*.config.ts (single source of truth in TS; mirrored here for DB-level enforcement).

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'nurse' check (role in ('nurse','supervisor','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.wards (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name text not null,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.nurses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  ward_id uuid not null references public.wards(id) on delete cascade,
  name text not null,
  tier text not null check (tier in ('junior','staff','senior')),
  base_cap numeric(6,2) not null check (base_cap > 0),
  max_patients integer not null check (max_patients between 1 and 20),
  consecutive_shifts integer not null default 0 check (consecutive_shifts >= 0),
  availability_status text not null default 'available'
    check (availability_status in ('available','unavailable','on_leave','off_shift','restricted')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards(id) on delete cascade,
  bed_no text not null,
  clinical_context text,
  s integer not null check (s between 1 and 4),
  m integer not null check (m between 1 and 4),
  v integer not null check (v between 1 and 4),
  d integer not null check (d between 1 and 4),
  admission boolean not null default false,
  discharge boolean not null default false,
  pre_op boolean not null default false,
  transfer boolean not null default false,
  t integer not null default 0,
  workload_score integer not null default 0,
  is_isolated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ward_id, bed_no)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards(id) on delete cascade,
  shift_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','active','closed')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create unique index shifts_one_active_per_ward on public.shifts (ward_id) where status = 'active';

create table public.nurse_competencies (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references public.nurses(id) on delete cascade,
  competency_code text not null,
  proficiency_level text not null check (proficiency_level in ('basic','intermediate','advanced')),
  verification_status text not null default 'pending' check (verification_status in ('verified','pending','revoked')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  expires_at timestamptz,
  unique (nurse_id, competency_code)
);

create table public.patient_requirements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  competency_code text not null,
  required_level text not null check (required_level in ('basic','intermediate','advanced')),
  is_mandatory boolean not null default true,
  unique (patient_id, competency_code)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  nurse_id uuid not null references public.nurses(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  workload_score integer not null,
  assignment_status text not null default 'approved' check (assignment_status in ('approved','reassigned','ended')),
  assigned_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index assignments_one_approved_per_patient on public.assignments (patient_id, shift_id) where assignment_status = 'approved';
create index assignments_nurse_shift on public.assignments (nurse_id, shift_id, assignment_status);

create table public.allocation_runs (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  algorithm_version text not null,
  config_version text not null,
  status text not null default 'preview' check (status in ('preview','approved','rejected','superseded')),
  input_snapshot jsonb not null,
  result_snapshot jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index allocation_runs_shift on public.allocation_runs (shift_id, created_at desc);

create table public.safety_alerts (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references public.shifts(id) on delete cascade,
  nurse_id uuid references public.nurses(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete cascade,
  severity text not null check (severity in ('INFO','WARNING','CRITICAL')),
  rule_code text not null,
  description text not null,
  resolution_status text not null default 'open' check (resolution_status in ('open','resolved','dismissed')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index safety_alerts_open_dedupe on public.safety_alerts (
  shift_id,
  coalesce(nurse_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(patient_id, '00000000-0000-0000-0000-000000000000'::uuid),
  rule_code
) where resolution_status = 'open';
create index safety_alerts_shift_status on public.safety_alerts (shift_id, resolution_status);

create table public.senior_authorizations (
  id uuid primary key default gen_random_uuid(),
  nurse_id uuid not null references public.nurses(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  authorized_by uuid not null references public.profiles(id),
  reason text not null check (length(reason) >= 4),
  created_at timestamptz not null default now(),
  unique (nurse_id, patient_id, shift_id)
);

create table public.shift_logs (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  snapshot jsonb not null,
  allocation_summary jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_logs_created on public.audit_logs (created_at desc);
create index patients_ward on public.patients (ward_id);
create index nurses_ward on public.nurses (ward_id);

-- ---------- helpers ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() in ('supervisor','admin'), false)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_role() = 'admin', false)
$$;
create or replace function public.my_nurse_ids() returns setof uuid
language plpgsql stable security definer set search_path = public as $$
begin return query select id from public.nurses where profile_id = auth.uid(); end $$;

create or replace function public.can_view_patient(pid uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if public.is_staff() then return true; end if;
  return exists (
    select 1 from public.assignments a join public.nurses n on n.id = a.nurse_id
    where a.patient_id = pid and n.profile_id = auth.uid() and a.assignment_status = 'approved');
end $$;

create or replace function public.level_ord(l text) returns int language sql immutable as $$
  select case l when 'basic' then 1 when 'intermediate' then 2 when 'advanced' then 3 else 0 end
$$;

create or replace function public.nurse_has_competency(p_nurse uuid, p_code text, p_level text, p_now timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.nurse_competencies c
    where c.nurse_id = p_nurse and c.competency_code = p_code
      and c.verification_status = 'verified'
      and (c.expires_at is null or c.expires_at > p_now)
      and public.level_ord(c.proficiency_level) >= public.level_ord(p_level))
$$;

-- ---------- scoring / integrity triggers ----------
create or replace function public.patient_compute_scores() returns trigger
language plpgsql security definer set search_path = public as $$
declare w jsonb;
begin
  select coalesce(configuration->'workload', '{}'::jsonb) into w from public.wards where id = new.ward_id;
  new.t := (case when new.admission then coalesce((w->>'admissionWeight')::int, 3) else 0 end)
         + (case when new.discharge then coalesce((w->>'dischargeWeight')::int, 3) else 0 end)
         + (case when new.pre_op   then coalesce((w->>'preOpWeight')::int, 2) else 0 end)
         + (case when new.transfer then coalesce((w->>'transferWeight')::int, 2) else 0 end);
  new.workload_score := new.s + new.m + new.v + new.d + new.t;
  return new;
end $$;
create trigger patients_compute before insert or update on public.patients
  for each row execute function public.patient_compute_scores();

create or replace function public.ward_config_version() returns trigger language plpgsql as $$
begin
  if new.configuration is distinct from old.configuration then
    new.configuration := jsonb_set(new.configuration, '{version}',
      to_jsonb(coalesce((old.configuration->>'version')::int, 0) + 1));
  end if;
  return new;
end $$;
create trigger wards_version before update of configuration on public.wards
  for each row execute function public.ward_config_version();

create or replace function public.ward_rescore_patients() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.configuration is distinct from old.configuration then
    update public.patients set s = s where ward_id = new.id; -- fires patients_compute with new weights
  end if;
  return null;
end $$;
create trigger wards_rescore after update of configuration on public.wards
  for each row execute function public.ward_rescore_patients();

create or replace function public.assignment_sync_score() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select workload_score into new.workload_score from public.patients where id = new.patient_id;
  return new;
end $$;
create trigger assignments_sync before insert on public.assignments
  for each row execute function public.assignment_sync_score();

create or replace function public.allocation_run_guard() returns trigger language plpgsql as $$
begin
  if new.input_snapshot is distinct from old.input_snapshot
     or new.result_snapshot is distinct from old.result_snapshot then
    raise exception 'IMMUTABLE_SNAPSHOT';
  end if;
  if new.status is distinct from old.status and old.status <> 'preview' then
    raise exception 'INVALID_TRANSITION';
  end if;
  return new;
end $$;
create trigger allocation_runs_guard before update on public.allocation_runs
  for each row execute function public.allocation_run_guard();

create or replace function public.profile_role_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'FORBIDDEN_ROLE_CHANGE';
  end if;
  return new;
end $$;
create trigger profiles_role_guard before update on public.profiles
  for each row execute function public.profile_role_guard();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'nurse')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (user_id, action_type, entity_type, entity_id, previous_state, new_state)
  values (auth.uid(), tg_op, tg_table_name, coalesce(new.id, old.id),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger audit_patients after insert or update or delete on public.patients for each row execute function public.audit_row();
create trigger audit_nurses after insert or update or delete on public.nurses for each row execute function public.audit_row();
create trigger audit_assignments after insert or update or delete on public.assignments for each row execute function public.audit_row();
create trigger audit_shifts after insert or update or delete on public.shifts for each row execute function public.audit_row();
create trigger audit_wards after insert or update or delete on public.wards for each row execute function public.audit_row();
create trigger audit_competencies after insert or update or delete on public.nurse_competencies for each row execute function public.audit_row();
create trigger audit_requirements after insert or update or delete on public.patient_requirements for each row execute function public.audit_row();
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.audit_row();
create trigger audit_runs after insert or update on public.allocation_runs for each row execute function public.audit_row();
create trigger audit_alerts after insert or update on public.safety_alerts for each row execute function public.audit_row();

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger nurses_touch before update on public.nurses for each row execute function public.touch_updated_at();
create trigger patients_touch before update on public.patients for each row execute function public.touch_updated_at();

-- ---------- transactional operations ----------
create or replace function public.approve_allocation_run(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_run public.allocation_runs; v_shift public.shifts; v_cfg jsonb;
  v_item jsonb; v_p public.patients; v_n public.nurses;
  v_cap numeric; v_load numeric; v_count int; v_thresh int; v_mult numeric;
  v_iso_code text; v_iso_req boolean; v_junior_auth boolean;
  v_now timestamptz := now(); v_approved int := 0; v_actor uuid := auth.uid();
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into v_run from public.allocation_runs where id = p_run_id for update;
  if not found then raise exception 'NOT_FOUND:run'; end if;
  if v_run.status <> 'preview' then raise exception 'INVALID_STATE:run already %', v_run.status; end if;
  select * into v_shift from public.shifts where id = v_run.shift_id;
  if v_shift.status <> 'active' then raise exception 'SHIFT_NOT_ACTIVE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_shift.id::text, 0));
  select configuration into v_cfg from public.wards where id = v_shift.ward_id;
  v_thresh := coalesce((v_cfg->'fatigue'->>'consecutiveShiftThreshold')::int, 3);
  v_mult := coalesce((v_cfg->'fatigue'->>'fatigueMultiplier')::numeric, 0.85);
  v_iso_code := coalesce(v_cfg->'safety'->>'isolationCompetencyCode', 'ISO');
  v_iso_req := coalesce((v_cfg->'safety'->>'requireIsolationCompetency')::boolean, true);
  v_junior_auth := coalesce((v_cfg->'safety'->>'juniorHighAcuityRequiresAuth')::boolean, true);

  for v_item in select value from jsonb_array_elements(v_run.result_snapshot->'proposed') loop
    select * into v_p from public.patients where id = (v_item->>'patient_id')::uuid for update;
    if not found then raise exception 'NOT_FOUND:patient %', v_item->>'patient_id'; end if;
    select * into v_n from public.nurses where id = (v_item->>'nurse_id')::uuid for update;
    if not found then raise exception 'NOT_FOUND:nurse %', v_item->>'nurse_id'; end if;
    if v_p.ward_id <> v_shift.ward_id or v_n.ward_id <> v_shift.ward_id then raise exception 'WARD_MISMATCH'; end if;
    if not v_n.is_active then raise exception 'NURSE_INACTIVE:%', v_n.id; end if;
    if v_n.availability_status <> 'available' then raise exception 'NURSE_UNAVAILABLE:%', v_n.id; end if;

    if v_item ? 'from_nurse_id' and (v_item->>'from_nurse_id') is not null then
      update public.assignments set assignment_status = 'reassigned'
      where patient_id = v_p.id and shift_id = v_shift.id and assignment_status = 'approved'
        and nurse_id = (v_item->>'from_nurse_id')::uuid;
      if not found then raise exception 'STALE_MOVE:patient %', v_p.id; end if;
    elsif exists (select 1 from public.assignments
                  where patient_id = v_p.id and shift_id = v_shift.id and assignment_status = 'approved') then
      raise exception 'ALREADY_ASSIGNED:patient %', v_p.id;
    end if;

    select coalesce(sum(workload_score), 0), count(*) into v_load, v_count
    from public.assignments where nurse_id = v_n.id and shift_id = v_shift.id and assignment_status = 'approved';
    v_cap := v_n.base_cap * (case when v_n.consecutive_shifts >= v_thresh then v_mult else 1 end);
    if v_count + 1 > v_n.max_patients then raise exception 'MAX_PATIENTS:%', v_n.id; end if;
    if v_load + v_p.workload_score > v_cap then raise exception 'MAX_WORKLOAD:%', v_n.id; end if;

    if exists (select 1 from public.patient_requirements r
               where r.patient_id = v_p.id and r.is_mandatory
                 and not public.nurse_has_competency(v_n.id, r.competency_code, r.required_level, v_now)) then
      raise exception 'COMPETENCY:%', v_n.id;
    end if;
    if v_p.is_isolated and v_iso_req and not public.nurse_has_competency(v_n.id, v_iso_code, 'basic', v_now) then
      raise exception 'ISOLATION_POLICY:%', v_n.id;
    end if;
    if v_junior_auth and v_n.tier = 'junior' and (v_p.s = 4 or v_p.m = 4)
       and not exists (select 1 from public.senior_authorizations a
                       where a.nurse_id = v_n.id and a.patient_id = v_p.id and a.shift_id = v_shift.id) then
      raise exception 'SENIOR_AUTH_REQUIRED:%', v_n.id;
    end if;

    insert into public.assignments
      (patient_id, nurse_id, shift_id, workload_score, assignment_status, assigned_by, approved_by, approved_at)
    values (v_p.id, v_n.id, v_shift.id, v_p.workload_score, 'approved', v_run.created_by, v_actor, v_now);
    v_approved := v_approved + 1;
  end loop;

  update public.allocation_runs set status = 'approved' where id = p_run_id;
  update public.allocation_runs set status = 'superseded'
    where shift_id = v_shift.id and status = 'preview' and id <> p_run_id;
  insert into public.audit_logs (user_id, action_type, entity_type, entity_id, new_state, reason)
  values (v_actor, 'APPROVE', 'allocation_run', p_run_id, jsonb_build_object('approved', v_approved), 'supervisor approved allocation');
  return jsonb_build_object('run_id', p_run_id, 'approved', v_approved);
end $$;

create or replace function public.reject_allocation_run(p_run_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_status text;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  update public.allocation_runs set status = 'rejected' where id = p_run_id and status = 'preview'
  returning status into v_status;
  if v_status is null then raise exception 'INVALID_STATE:run not in preview'; end if;
  insert into public.audit_logs (user_id, action_type, entity_type, entity_id, reason)
  values (v_actor, 'REJECT', 'allocation_run', p_run_id, p_reason);
  return jsonb_build_object('run_id', p_run_id, 'status', 'rejected');
end $$;

create or replace function public.co_sign_assignment(p_nurse_id uuid, p_patient_id uuid, p_shift_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  if length(coalesce(p_reason, '')) < 4 then raise exception 'INVALID_REASON'; end if;
  insert into public.senior_authorizations (nurse_id, patient_id, shift_id, authorized_by, reason)
  values (p_nurse_id, p_patient_id, p_shift_id, v_actor, p_reason)
  on conflict (nurse_id, patient_id, shift_id) do update set reason = excluded.reason
  returning id into v_id;
  update public.safety_alerts set resolution_status = 'resolved', resolved_by = v_actor, resolved_at = now()
  where shift_id = p_shift_id and nurse_id = p_nurse_id and patient_id = p_patient_id
    and rule_code in ('JUNIOR_S4','JUNIOR_M4') and resolution_status = 'open';
  insert into public.audit_logs (user_id, action_type, entity_type, entity_id, reason)
  values (v_actor, 'CO_SIGN', 'senior_authorization', v_id, p_reason);
  return jsonb_build_object('authorization_id', v_id);
end $$;

create or replace function public.close_shift(p_shift_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_shift public.shifts; v_cfg jsonb; v_thresh int; v_mult numeric;
  v_nurses jsonb; v_summary jsonb; v_max_u numeric; v_avg_u numeric;
  v_total int; v_assigned int; v_alerts int; v_actor uuid := auth.uid();
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then raise exception 'NOT_FOUND:shift'; end if;
  if v_shift.status <> 'active' then raise exception 'INVALID_STATE:shift not active'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_shift.id::text, 0));
  select configuration into v_cfg from public.wards where id = v_shift.ward_id;
  v_thresh := coalesce((v_cfg->'fatigue'->>'consecutiveShiftThreshold')::int, 3);
  v_mult := coalesce((v_cfg->'fatigue'->>'fatigueMultiplier')::numeric, 0.85);

  select jsonb_agg(jsonb_build_object(
    'nurse_id', n.id, 'name', n.name, 'tier', n.tier, 'is_active', n.is_active,
    'assigned_w', coalesce(x.w, 0), 'patient_count', coalesce(x.c, 0),
    'adjusted_capacity', n.base_cap * (case when n.consecutive_shifts >= v_thresh then v_mult else 1 end),
    'utilization', coalesce(x.w, 0) / (n.base_cap * (case when n.consecutive_shifts >= v_thresh then v_mult else 1 end))))
  into v_nurses
  from public.nurses n
  left join (select nurse_id, sum(workload_score) w, count(*) c from public.assignments
             where shift_id = p_shift_id and assignment_status = 'approved' group by nurse_id) x on x.nurse_id = n.id
  where n.ward_id = v_shift.ward_id;

  select coalesce(max((e->>'utilization')::numeric), 0), coalesce(avg((e->>'utilization')::numeric), 0)
  into v_max_u, v_avg_u from jsonb_array_elements(coalesce(v_nurses, '[]'::jsonb)) e
  where (e->>'is_active')::boolean;
  select count(*) into v_total from public.patients where ward_id = v_shift.ward_id;
  select count(distinct patient_id) into v_assigned from public.assignments
    where shift_id = p_shift_id and assignment_status = 'approved';
  select count(*) into v_alerts from public.safety_alerts where shift_id = p_shift_id and resolution_status = 'open';
  v_summary := jsonb_build_object('max_u', v_max_u, 'avg_u', v_avg_u, 'patient_total', v_total,
                                 'assigned', v_assigned, 'unassigned', v_total - v_assigned, 'alerts_open', v_alerts);

  insert into public.shift_logs (shift_id, snapshot, allocation_summary, created_by)
  values (p_shift_id, coalesce(v_nurses, '[]'::jsonb), v_summary, v_actor);
  update public.assignments set assignment_status = 'ended' where shift_id = p_shift_id and assignment_status = 'approved';
  update public.nurses set consecutive_shifts = consecutive_shifts + 1
    where ward_id = v_shift.ward_id and id in (select distinct nurse_id from public.assignments where shift_id = p_shift_id);
  update public.nurses set consecutive_shifts = 0
    where ward_id = v_shift.ward_id and is_active
      and id not in (select distinct nurse_id from public.assignments where shift_id = p_shift_id);
  update public.shifts set status = 'closed' where id = p_shift_id;
  insert into public.audit_logs (user_id, action_type, entity_type, entity_id, new_state, reason)
  values (v_actor, 'CLOSE', 'shift', p_shift_id, v_summary, 'shift closed');
  return v_summary;
end $$;

revoke execute on function public.approve_allocation_run(uuid), public.reject_allocation_run(uuid, text),
  public.co_sign_assignment(uuid, uuid, uuid, text), public.close_shift(uuid) from public, anon;
grant execute on function public.approve_allocation_run(uuid), public.reject_allocation_run(uuid, text),
  public.co_sign_assignment(uuid, uuid, uuid, text), public.close_shift(uuid) to authenticated;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.hospitals enable row level security;
alter table public.wards enable row level security;
alter table public.nurses enable row level security;
alter table public.patients enable row level security;
alter table public.shifts enable row level security;
alter table public.nurse_competencies enable row level security;
alter table public.patient_requirements enable row level security;
alter table public.assignments enable row level security;
alter table public.allocation_runs enable row level security;
alter table public.safety_alerts enable row level security;
alter table public.senior_authorizations enable row level security;
alter table public.shift_logs enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin());
create policy hospitals_select on public.hospitals for select to authenticated using (true);
create policy wards_select on public.wards for select to authenticated using (true);
create policy wards_update on public.wards for update to authenticated using (public.is_admin());
create policy wards_insert on public.wards for insert to authenticated with check (public.is_admin());
create policy nurses_select on public.nurses for select to authenticated using (public.is_staff() or profile_id = auth.uid());
create policy nurses_write on public.nurses for insert to authenticated with check (public.is_staff());
create policy nurses_update on public.nurses for update to authenticated using (public.is_staff());
create policy nurses_delete on public.nurses for delete to authenticated using (public.is_staff());
create policy patients_select on public.patients for select to authenticated using (public.can_view_patient(id));
create policy patients_write on public.patients for insert to authenticated with check (public.is_staff());
create policy patients_update on public.patients for update to authenticated using (public.is_staff());
create policy patients_delete on public.patients for delete to authenticated using (public.is_staff());
create policy shifts_select on public.shifts for select to authenticated using (true);
create policy shifts_write on public.shifts for insert to authenticated with check (public.is_staff());
create policy shifts_update on public.shifts for update to authenticated using (public.is_staff());
create policy competencies_select on public.nurse_competencies for select to authenticated
  using (public.is_staff() or exists (select 1 from public.nurses n where n.id = nurse_id and n.profile_id = auth.uid()));
create policy competencies_write on public.nurse_competencies for insert to authenticated with check (public.is_staff());
create policy competencies_update on public.nurse_competencies for update to authenticated using (public.is_staff());
create policy competencies_delete on public.nurse_competencies for delete to authenticated using (public.is_staff());
create policy requirements_select on public.patient_requirements for select to authenticated using (public.can_view_patient(patient_id));
create policy requirements_write on public.patient_requirements for insert to authenticated with check (public.is_staff());
create policy requirements_update on public.patient_requirements for update to authenticated using (public.is_staff());
create policy requirements_delete on public.patient_requirements for delete to authenticated using (public.is_staff());
-- assignments: reads scoped; ALL writes go through security-definer RPCs (no insert/update/delete policies).
create policy assignments_select on public.assignments for select to authenticated
  using (public.is_staff() or nurse_id in (select public.my_nurse_ids()));
create policy runs_select on public.allocation_runs for select to authenticated using (public.is_staff());
create policy runs_insert on public.allocation_runs for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy runs_update on public.allocation_runs for update to authenticated using (public.is_staff());
create policy alerts_select on public.safety_alerts for select to authenticated
  using (public.is_staff() or nurse_id in (select public.my_nurse_ids()));
create policy alerts_insert on public.safety_alerts for insert to authenticated with check (public.is_staff());
create policy alerts_update on public.safety_alerts for update to authenticated using (public.is_staff());
create policy authorizations_select on public.senior_authorizations for select to authenticated using (public.is_staff());
create policy shift_logs_select on public.shift_logs for select to authenticated using (public.is_staff());
create policy audit_select on public.audit_logs for select to authenticated using (public.is_admin());

-- ---------- realtime ----------
do $$ begin alter publication supabase_realtime add table public.patients; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.nurses; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.assignments; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.safety_alerts; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shifts; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.allocation_runs; exception when duplicate_object then null; when undefined_object then null; end $$;