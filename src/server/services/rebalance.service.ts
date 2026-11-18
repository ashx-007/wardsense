import type { AllocationInput, AllocationResult, Patient, ProposedAssignment, SafetyViolation } from '../../types/index.ts';
import { ALGORITHM_VERSION, auditCurrent, buildStates, finalizeResult, maxUtilSnapshot, placePatients, snapshot, workloadOf } from './allocation.service.ts';
import type { NurseState } from './allocation.service.ts';
import { validateAssignment } from './safety.service.ts';

export const REBALANCE_VERSION = 'greedy-minimax-rebalance-v1';

function maxUtilStates(states: Map<string, NurseState>): number {
    let m = 0;
    for (const st of states.values()) if (st.nurse.is_active && st.cap > 0) m = Math.max(m, st.load / st.cap);
    return m;
}

/**
 * Preview-only rebalance. Moves patients off unavailable/inactive nurses and relieves overloaded nurses
 * when a safety-eligible target exists. Forced moves may raise ward max utilization, but targets must
 * remain within the configured amber threshold.
 * Existing approved assignments are untouched until supervisor approval (applied transactionally by RPC).
 */
export function planRebalance(input: AllocationInput): AllocationResult {
    const { states, approved, assignedIds, byId } = buildStates(input);
    const before = snapshot(states, input.cfg);
    const violations: SafetyViolation[] = [];
    auditCurrent(states, approved, input, byId, violations);

    const moves: ProposedAssignment[] = [];
    const moved = new Set<string>();
    const stuck = new Set<string>();
    const amber = input.cfg.utilization.amberThreshold;

    for (let guard = 0; guard < input.patients.length + 1; guard++) {
        const overloaded = [...states.values()]
            .filter(st => st.count > 0 && st.cap > 0 &&
                (!st.nurse.is_active || st.nurse.availability_status !== 'available' || st.load / st.cap > amber) &&
                !stuck.has(st.nurse.id))
            .sort((a, b) => {
                const aUnavailable = !a.nurse.is_active || a.nurse.availability_status !== 'available';
                const bUnavailable = !b.nurse.is_active || b.nurse.availability_status !== 'available';
                return Number(bUnavailable) - Number(aUnavailable) || b.load / b.cap - a.load / a.cap;
            });
        if (overloaded.length === 0) break;
        const src = overloaded[0];
        const forcedMove = !src.nurse.is_active || src.nurse.availability_status !== 'available';
        const srcU = src.load / src.cap;
        const maxBefore = maxUtilStates(states);
        const minFix = src.load - src.cap; // workload that clears the overload in one move
        const owned = approved
            .filter(a => a.nurse_id === src.nurse.id && !moved.has(a.patient_id))
            .map(a => byId.get(a.patient_id))
            .filter((p): p is Patient => Boolean(p))
            .sort((a, b) => {
                const wa = workloadOf(a, input.cfg), wb = workloadOf(b, input.cfg);
                return (wb >= minFix ? 1 : 0) - (wa >= minFix ? 1 : 0) || wb - wa;
            });

        let best: { p: Patient; tgt: NurseState; w: number; srcAfter: number; tgtAfter: number; maxAfter: number; warnings: SafetyViolation[] } | null = null;
        for (const p of owned) {
            const w = workloadOf(p, input.cfg);
            for (const tgt of states.values()) {
                if (tgt.nurse.id === src.nurse.id) continue;
                const vio = validateAssignment({ nurse: tgt.nurse, patient: p, shift: input.shift, currentLoad: tgt.load, currentCount: tgt.count, authorizations: input.authorizations, cfg: input.cfg, now: input.now });
                if (vio.some(v => v.severity === 'CRITICAL')) continue;
                const srcAfter = (src.load - w) / src.cap;
                const tgtAfter = (tgt.load + w) / tgt.cap;
                if (tgtAfter > amber || srcAfter >= srcU) continue;
                const others = [...states.values()].filter(s => s !== src && s !== tgt && s.nurse.is_active && s.cap > 0).map(s => s.load / s.cap);
                const maxAfter = Math.max(0, ...others, srcAfter, tgtAfter);
                if (!forcedMove && maxAfter > maxBefore + 1e-9) continue;
                if (!best || maxAfter < best.maxAfter - 1e-12 || (Math.abs(maxAfter - best.maxAfter) < 1e-12 && tgtAfter < best.tgtAfter))
                    best = { p, tgt, w, srcAfter, tgtAfter, maxAfter, warnings: vio.filter(v => v.severity !== 'CRITICAL') };
            }
        }
        if (!best) { stuck.add(src.nurse.id); continue; }
        src.load -= best.w; src.count -= 1;
        best.tgt.load += best.w; best.tgt.count += 1;
        moved.add(best.p.id);
        violations.push(...best.warnings);
        moves.push({
            patient_id: best.p.id, nurse_id: best.tgt.nurse.id, from_nurse_id: src.nurse.id,
            workload: best.w, projected_utilization: best.tgtAfter,
            explanation: forcedMove
                ? `Moves patient off ${src.nurse.name} (${src.nurse.availability_status === 'available' ? 'inactive' : src.nurse.availability_status}); ${best.tgt.nurse.name} → ${(best.tgtAfter * 100).toFixed(1)}% (≤ ${(amber * 100).toFixed(0)}%).`
                : `Relieves ${src.nurse.name} ${(srcU * 100).toFixed(1)}% → ${(best.srcAfter * 100).toFixed(1)}%; ${best.tgt.nurse.name} → ${(best.tgtAfter * 100).toFixed(1)}% (≤ ${(amber * 100).toFixed(0)}%); ward max ${(maxBefore * 100).toFixed(1)}% → ${(best.maxAfter * 100).toFixed(1)}%.`,
        });
    }

    const pool = input.patients.filter(p => !assignedIds.has(p.id));
    const { proposed, unassigned, blocked } = placePatients(states, pool, input, violations);
    const after = snapshot(states, input.cfg);
    const result = finalizeResult(input, 'rebalance', REBALANCE_VERSION, approved, [...moves, ...proposed], unassigned, blocked, violations, before, after);
    result.algorithm_version = `${REBALANCE_VERSION}+${ALGORITHM_VERSION}`;
    return result;
}
