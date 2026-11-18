import type { AllocationInput, AllocationResult, Assignment, Nurse, NurseUtilization, Patient, ProposedAssignment, ResolvedConfig, SafetyViolation, UnassignedPatient } from '../../types/index.ts';
import { computeWorkload } from './scoring.service.ts';
import { adjustedCapacity } from './capacity.service.ts';
import { nurseUtilization } from './utilization.service.ts';
import { validateAssignment } from './safety.service.ts';

export const ALGORITHM_VERSION = 'greedy-minimax-v1';

export interface NurseState { nurse: Nurse; load: number; count: number; cap: number; }

export function workloadOf(p: Patient, cfg: ResolvedConfig): number { return computeWorkload(p, cfg).workload_score; }

export function buildStates(input: AllocationInput) {
    const states = new Map<string, NurseState>();
    for (const n of input.nurses) states.set(n.id, { nurse: n, load: 0, count: 0, cap: adjustedCapacity(n, input.cfg) });
    const approved = input.assignments.filter(a => a.shift_id === input.shift.id && a.assignment_status === 'approved');
    const assignedIds = new Set<string>();
    const byId = new Map(input.patients.map(p => [p.id, p]));
    for (const a of approved) {
        const st = states.get(a.nurse_id); const p = byId.get(a.patient_id);
        if (st && p) { st.load += workloadOf(p, input.cfg); st.count += 1; assignedIds.add(p.id); }
    }
    return { states, approved, assignedIds, byId };
}

export function snapshot(states: Map<string, NurseState>, cfg: ResolvedConfig): Record<string, NurseUtilization> {
    const out: Record<string, NurseUtilization> = {};
    for (const st of states.values()) out[st.nurse.id] = nurseUtilization(st.nurse, st.load, st.count, cfg);
    return out;
}

export function maxUtilSnapshot(snap: Record<string, NurseUtilization>): number {
    let m = 0;
    for (const u of Object.values(snap)) if (u.is_active && Number.isFinite(u.utilization)) m = Math.max(m, u.utilization);
    return m;
}

/** Sort: workload desc → clinical complexity (S+M) desc → specialized requirements desc → authorization need desc → bed asc (deterministic). */
export function sortPatients(pool: Patient[], cfg: ResolvedConfig): Patient[] {
    const key = (p: Patient) => ({
        w: workloadOf(p, cfg), cx: p.s + p.m,
        spec: (p.requirements ?? []).filter(r => r.is_mandatory).length + (p.is_isolated ? 1 : 0),
        auth: p.s === 4 || p.m === 4 ? 1 : 0,
    });
    return [...pool].sort((a, b) => {
        const ka = key(a), kb = key(b);
        return kb.w - ka.w || kb.cx - ka.cx || kb.spec - ka.spec || kb.auth - ka.auth || a.bed_no.localeCompare(b.bed_no);
    });
}

export function auditCurrent(states: Map<string, NurseState>, approved: Assignment[], input: AllocationInput, byId: Map<string, Patient>, violations: SafetyViolation[]): void {
    for (const a of approved) {
        const st = states.get(a.nurse_id); const p = byId.get(a.patient_id);
        if (!st || !p) continue;
        violations.push(...validateAssignment({ nurse: st.nurse, patient: p, shift: input.shift, currentLoad: st.load, currentCount: st.count, authorizations: input.authorizations, cfg: input.cfg, now: input.now, additionalWorkload: 0, additionalCount: 0 }));
    }
}

/** Greedy placement: lowest projected utilization among safety-eligible nurses. Hard rules are never bypassed. */
export function placePatients(states: Map<string, NurseState>, pool: Patient[], input: AllocationInput, violations: SafetyViolation[]) {
    const proposed: ProposedAssignment[] = [];
    const unassigned: UnassignedPatient[] = [];
    const blocked = new Map<string, Set<string>>();
    for (const p of sortPatients(pool, input.cfg)) {
        const w = workloadOf(p, input.cfg);
        const candidates: { st: NurseState; projected: number; warnings: SafetyViolation[] }[] = [];
        const ruleCounts = new Map<string, number>();
        for (const st of states.values()) {
            const vio = validateAssignment({ nurse: st.nurse, patient: p, shift: input.shift, currentLoad: st.load, currentCount: st.count, authorizations: input.authorizations, cfg: input.cfg, now: input.now });
            const hard = vio.filter(v => v.severity === 'CRITICAL');
            if (hard.length > 0) {
                if (!blocked.has(st.nurse.id)) blocked.set(st.nurse.id, new Set());
                for (const h of hard) { blocked.get(st.nurse.id)!.add(h.rule_code); ruleCounts.set(h.rule_code, (ruleCounts.get(h.rule_code) ?? 0) + 1); }
                continue;
            }
            candidates.push({ st, projected: (st.load + w) / st.cap, warnings: vio });
        }
        if (candidates.length === 0) {
            unassigned.push({ patient_id: p.id, workload: w, reasons: [...ruleCounts.entries()].map(([r, n]) => `${r} (${n} nurse${n === 1 ? '' : 's'})`) });
            continue;
        }
        candidates.sort((a, b) => a.projected - b.projected || a.st.load - b.st.load || a.st.count - b.st.count || a.st.nurse.name.localeCompare(b.st.nurse.name) || a.st.nurse.id.localeCompare(b.st.nurse.id));
        const best = candidates[0];
        best.st.load += w; best.st.count += 1;
        violations.push(...best.warnings);
        proposed.push({
            patient_id: p.id, nurse_id: best.st.nurse.id, workload: w, projected_utilization: best.projected,
            explanation: `W=${w}. ${best.st.nurse.name} has the lowest projected utilization (${(best.projected * 100).toFixed(1)}%) of ${candidates.length} eligible nurse(s); ${states.size - candidates.length} blocked by safety rules.`,
        });
    }
    return { proposed, unassigned, blocked };
}

export function finalizeResult(input: AllocationInput, mode: 'assign' | 'rebalance', version: string, current: Assignment[], proposed: ProposedAssignment[], unassigned: UnassignedPatient[], blocked: Map<string, Set<string>>, violations: SafetyViolation[], before: Record<string, NurseUtilization>, after: Record<string, NurseUtilization>): AllocationResult {
    const dedup = new Map<string, SafetyViolation>();
    for (const v of violations) dedup.set(`${v.rule_code}|${v.nurse_id ?? ''}|${v.patient_id ?? ''}`, v);
    return {
        algorithm_version: version, mode, current, proposed, unassigned,
        ineligible_nurses: [...blocked.entries()].map(([nurse_id, rules]) => ({ nurse_id, reasons: [...rules] })),
        violations: [...dedup.values()], before, after,
        max_before: maxUtilSnapshot(before), max_after: maxUtilSnapshot(after),
    };
}

/** Greedy minimax-oriented heuristic. Does NOT guarantee a globally optimal allocation. */
export function planAllocation(input: AllocationInput): AllocationResult {
    const { states, approved, assignedIds, byId } = buildStates(input);
    const before = snapshot(states, input.cfg);
    const violations: SafetyViolation[] = [];
    auditCurrent(states, approved, input, byId, violations);
    const pool = input.patients.filter(p => !assignedIds.has(p.id));
    const { proposed, unassigned, blocked } = placePatients(states, pool, input, violations);
    const after = snapshot(states, input.cfg);
    return finalizeResult(input, 'assign', ALGORITHM_VERSION, approved, proposed, unassigned, blocked, violations, before, after);
}