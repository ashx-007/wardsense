-- Migration 0002: Dual Role Support for Supervisors with Linked Nurse Records
-- WardSense clinical decision support platform
--
-- Objective:
-- Enable a user with role='supervisor' or 'admin' to also have an associated nurse record,
-- allowing seamless demonstration and operation of both Supervisor and Nurse dashboards.
--
-- Reversible: Rollback instructions provided at bottom.

-- 1. Index on profile_id to optimize linked-account lookups
create index if not exists idx_nurses_profile_id on public.nurses(profile_id);

-- 2. Security definer helper to fetch the linked nurse record for the authenticated user
create or replace function public.my_linked_nurse()
returns setof public.nurses
language sql stable security definer set search_path = public as $$
  select * from public.nurses where profile_id = auth.uid() limit 1;
$$;

-- 3. Document the dual-role design on the column
comment on column public.nurses.profile_id is 
  'References public.profiles(id). When set for a user with role=supervisor or admin, grants access to both Supervisor and Nurse dashboard views without altering base permissions.';

-- ============================================================================
-- Rollback Instructions (Reversible):
-- To revert this migration, run:
--   drop function if exists public.my_linked_nurse();
--   drop index if exists public.idx_nurses_profile_id;
-- ============================================================================
