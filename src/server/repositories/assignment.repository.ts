import type { SupabaseClient } from '@supabase/supabase-js';
import type { AllocationResult, AllocationRun, Assignment, SafetyViolation } from '../../types/index.ts';

export async function currentAssignments(sb: SupabaseClient, shiftId: string): Promise<Assignment[]> {
    const { data, error } = await sb.from('assignments')
        .select('*, patient:patients(*, requirements:patient_requirements(*)), nurse:nurses(*, competencies:nurse_competencies(*))')
        .eq('shift_id', shiftId).eq('assignment_status', 'approved');
    if (error) throw new Error(error.message);
    return (data ?? []) as Assignment[];
}

export async function insertRun(sb: SupabaseClient, shiftId: string, userId: string, configVersion: string, result: AllocationResult, inputSnapshot: Record<string, unknown>): Promise<AllocationRun> {
    const { data, error } = await sb.from('allocation_runs').insert({
        shift_id: shiftId, algorithm_version: result.algorithm_version, config_version: configVersion,
        status: 'preview', input_snapshot: inputSnapshot, result_snapshot: result, created_by: userId,
    }).select().single();
    if (error) throw error;
    return data as AllocationRun;
}

export async function latestRun(sb: SupabaseClient, shiftId: string): Promise<AllocationRun | null> {
    const { data } = await sb.from('allocation_runs').select('*').eq('shift_id', shiftId).order('created_at', { ascending: false }).limit(1);
    return (data?.[0] as AllocationRun) ?? null;
}

export async function listRuns(sb: SupabaseClient, range: { from: number; to: number }, shiftId?: string) {
    let q = sb.from('allocation_runs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(range.from, range.to);
    if (shiftId) q = q.eq('shift_id', shiftId);
    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as AllocationRun[], total: count ?? 0 };
}

/** Persist preview violations as open alerts; the partial unique index dedupes repeats. */
export async function persistAlerts(sb: SupabaseClient, shiftId: string, violations: SafetyViolation[]): Promise<number> {
    let created = 0;
    for (const v of violations) {
        const { error } = await sb.from('safety_alerts').insert({ shift_id: shiftId, nurse_id: v.nurse_id, patient_id: v.patient_id, severity: v.severity, rule_code: v.rule_code, description: v.description });
        if (!error) created++;
        else if ((error as { code?: string }).code !== '23505') throw error;
    }
    return created;
}