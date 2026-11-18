import type { ResolvedConfig } from '../../types/index.ts';

export interface AcuityInput {
    s: number; m: number; v: number; d: number;
    admission: boolean; discharge: boolean; pre_op: boolean; transfer: boolean; is_isolated: boolean;
}

export function assertAcuity(i: AcuityInput): void {
    for (const k of ['s', 'm', 'v', 'd'] as const) {
        const val = i[k];
        if (!Number.isInteger(val) || val < 1 || val > 4) throw new Error(`INVALID_ACUITY:${k}`);
    }
}

/** T = admission*3 + discharge*3 + preOp*2 + transfer*2 (weights configurable). Isolation contributes 0. */
export function transitionWorkload(i: AcuityInput, cfg: ResolvedConfig): number {
    const w = cfg.workload;
    return (i.admission ? w.admissionWeight : 0) + (i.discharge ? w.dischargeWeight : 0)
        + (i.pre_op ? w.preOpWeight : 0) + (i.transfer ? w.transferWeight : 0);
}

export interface WorkloadBreakdown { t: number; workload_score: number; parts: { label: string; points: number }[]; isolation_note: string | null; explanation: string; }

/** Additive model: W = S + M + V + D + T. Never multiplicative. */
export function computeWorkload(i: AcuityInput, cfg: ResolvedConfig): WorkloadBreakdown {
    assertAcuity(i);
    const t = transitionWorkload(i, cfg);
    const workload_score = i.s + i.m + i.v + i.d + t;
    const parts = [
        { label: 'Stability (S)', points: i.s },
        { label: 'Medication/IV complexity (M)', points: i.m },
        { label: 'Vital-sign monitoring (V)', points: i.v },
        { label: 'Physical dependency (D)', points: i.d },
        { label: 'Admission', points: i.admission ? cfg.workload.admissionWeight : 0 },
        { label: 'Discharge', points: i.discharge ? cfg.workload.dischargeWeight : 0 },
        { label: 'Pre-Op', points: i.pre_op ? cfg.workload.preOpWeight : 0 },
        { label: 'Transfer', points: i.transfer ? cfg.workload.transferWeight : 0 },
    ];
    const flags = parts.slice(4).filter(p => p.points > 0).map(p => `${p.label} (+${p.points})`).join(' + ');
    const explanation = `W = S(${i.s}) + M(${i.m}) + V(${i.v}) + D(${i.d}) + T(${t}) = ${workload_score}.`
        + (flags ? ` T = ${flags}.` : ' T = no transition flags active.')
        + (i.is_isolated ? ' Isolation adds 0 points; it is enforced by the safety/eligibility engine.' : '');
    return { t, workload_score, parts, isolation_note: i.is_isolated ? 'Isolation is tracked separately from W.' : null, explanation };
}