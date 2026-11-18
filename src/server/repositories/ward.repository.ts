import type { SupabaseClient } from '@supabase/supabase-js';
import type { AllocationInput, Assignment, Nurse, Patient, ResolvedConfig, SeniorAuthorization, Shift, Ward } from '../../types/index.ts';
import { resolveConfig } from '../../config/index.ts';

export async function getWard(sb: SupabaseClient): Promise<{ ward: Ward; cfg: ResolvedConfig }> {
    const { data, error } = await sb.from('wards').select('*').order('created_at').limit(1).single();
    if (error || !data) throw new Error('NOT_FOUND:ward — run supabase/seed.sql');
    return { ward: data as Ward, cfg: resolveConfig(data.configuration) };
}

export async function loadAllocationInput(sb: SupabaseClient, shift: Shift): Promise<AllocationInput> {
    const { cfg } = await getWard(sb);
    const [nurses, patients, assignments, auths] = await Promise.all([
        sb.from('nurses').select('*, competencies:nurse_competencies(*)').eq('ward_id', shift.ward_id),
        sb.from('patients').select('*, requirements:patient_requirements(*)').eq('ward_id', shift.ward_id),
        sb.from('assignments').select('*').eq('shift_id', shift.id).eq('assignment_status', 'approved'),
        sb.from('senior_authorizations').select('*').eq('shift_id', shift.id),
    ]);
    for (const r of [nurses, patients, assignments, auths]) if (r.error) throw new Error(r.error.message);
    return {
        shift, cfg, now: new Date(),
        nurses: (nurses.data ?? []) as Nurse[],
        patients: (patients.data ?? []) as Patient[],
        assignments: (assignments.data ?? []) as Assignment[],
        authorizations: (auths.data ?? []) as SeniorAuthorization[],
    };
}