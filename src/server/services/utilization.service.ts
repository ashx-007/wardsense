import type { Assignment, Nurse, NurseUtilization, Patient, ResolvedConfig, WorkloadStatus } from '../../types/index.ts';
import { fatigueMultiplier } from './fatigue.service.ts';
import { computeWorkload } from './scoring.service.ts';

export function utilization(assignedW: number, adjustedCapacity: number): number {
    if (adjustedCapacity <= 0) return assignedW > 0 ? Infinity : 0;
    return assignedW / adjustedCapacity;
}

/** Exact, unrounded classification: green U<0.75, amber 0.75<=U<=1.00, red U>1.00. */
export function classifyUtilization(u: number, cfg: ResolvedConfig): WorkloadStatus {
    if (u < cfg.utilization.greenThreshold) return 'green';
    if (u <= cfg.utilization.amberThreshold) return 'amber';
    return 'red';
}

export function nurseUtilization(nurse: Nurse, assignedW: number, patientCount: number, cfg: ResolvedConfig): NurseUtilization {
    const mult = fatigueMultiplier(nurse.consecutive_shifts, cfg);
    const cap = nurse.base_cap * mult;
    const u = utilization(assignedW, cap);
    return {
        nurse_id: nurse.id, name: nurse.name, tier: nurse.tier, patient_count: patientCount, assigned_w: assignedW,
        base_capacity: nurse.base_cap, fatigue_multiplier: mult, adjusted_capacity: cap,
        utilization: u, status: classifyUtilization(u, cfg), availability_status: nurse.availability_status, is_active: nurse.is_active,
    };
}

export function wardUtilizations(nurses: Nurse[], patients: Patient[], assignments: Assignment[], shiftId: string | null, cfg: ResolvedConfig): NurseUtilization[] {
    const byId = new Map(patients.map(p => [p.id, p]));
    const agg = new Map<string, { w: number; c: number }>();
    for (const a of assignments) {
        if (a.assignment_status !== 'approved' || (shiftId && a.shift_id !== shiftId)) continue;
        const p = byId.get(a.patient_id);
        if (!p) continue;
        const cur = agg.get(a.nurse_id) ?? { w: 0, c: 0 };
        cur.w += computeWorkload(p, cfg).workload_score;
        cur.c += 1;
        agg.set(a.nurse_id, cur);
    }
    return nurses.map(n => { const a = agg.get(n.id) ?? { w: 0, c: 0 }; return nurseUtilization(n, a.w, a.c, cfg); });
}

export function wardStats(patients: Patient[], assignments: Assignment[], shiftId: string | null, utils: NurseUtilization[], cfg: ResolvedConfig) {
    const ws = patients.map(p => ({ p, w: computeWorkload(p, cfg).workload_score }));
    const assignedIds = new Set(assignments.filter(a => a.assignment_status === 'approved' && (!shiftId || a.shift_id === shiftId)).map(a => a.patient_id));
    const active = utils.filter(u => u.is_active);
    const highest = ws.reduce<{ p: Patient; w: number } | null>((best, x) => (!best || x.w > best.w ? x : best), null);
    return {
        total_patients: patients.length,
        active_nurses: active.filter(u => u.availability_status === 'available').length,
        unassigned_patients: patients.filter(p => !assignedIds.has(p.id)).length,
        avg_patient_workload: ws.length ? ws.reduce((s, x) => s + x.w, 0) / ws.length : 0,
        highest_patient: highest ? { id: highest.p.id, bed_no: highest.p.bed_no, workload: highest.w } : null,
        isolation_count: patients.filter(p => p.is_isolated).length,
        transition_count: patients.filter(p => p.admission || p.discharge || p.pre_op || p.transfer).length,
        avg_utilization: active.length ? active.reduce((s, u) => s + u.utilization, 0) / active.length : 0,
        max_utilization: active.reduce((m, u) => Math.max(m, u.utilization), 0),
    };
}