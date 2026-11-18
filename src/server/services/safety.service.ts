import type { Nurse, Patient, ResolvedConfig, SafetyViolation, SeniorAuthorization, Shift } from '../../types/index.ts';
import { adjustedCapacity } from './capacity.service.ts';
import { checkAvailability } from './availability.service.ts';
import { checkCompetencies, isCompetencyValid } from './competency.service.ts';

export interface AssignmentContext {
    nurse: Nurse; patient: Patient; shift: Shift;
    currentLoad: number; currentCount: number;
    authorizations: SeniorAuthorization[]; cfg: ResolvedConfig; now: Date;
    additionalWorkload?: number; additionalCount?: number;
}

/** Independent of scoring. CRITICAL = hard block, never bypassed by allocation or co-sign. */
export function validateAssignment(ctx: AssignmentContext): SafetyViolation[] {
    const { nurse, patient, shift, cfg, now } = ctx;
    const out: SafetyViolation[] = [...checkAvailability(nurse, shift)];
    for (const v of checkCompetencies(nurse, patient.requirements ?? [], now)) out.push({ ...v, patient_id: patient.id });

    const addW = ctx.additionalWorkload ?? patient.workload_score;
    const addC = ctx.additionalCount ?? 1;
    if (ctx.currentCount + addC > nurse.max_patients)
        out.push({ severity: 'CRITICAL', rule_code: 'MAX_PATIENTS', description: `${nurse.name} would exceed N_max (${nurse.max_patients}).`, nurse_id: nurse.id, patient_id: patient.id });
    const cap = adjustedCapacity(nurse, cfg);
    if (ctx.currentLoad + addW > cap)
        out.push({ severity: 'CRITICAL', rule_code: 'MAX_WORKLOAD', description: `${nurse.name} would exceed adjusted capacity (${ctx.currentLoad}+${addW} > ${cap}).`, nurse_id: nurse.id, patient_id: patient.id });

    if (cfg.safety.juniorHighAcuityRequiresAuth && nurse.tier === 'junior' && (patient.s === 4 || patient.m === 4)) {
        const authed = ctx.authorizations.some(a => a.nurse_id === nurse.id && a.patient_id === patient.id && a.shift_id === shift.id);
        for (const [flag, code] of [[patient.s === 4, 'JUNIOR_S4'], [patient.m === 4, 'JUNIOR_M4']] as const) {
            if (!flag) continue;
            out.push({
                severity: authed ? 'WARNING' : 'CRITICAL', rule_code: code,
                description: authed
                    ? `Junior RN assigned ${code === 'JUNIOR_S4' ? 'S=4' : 'M=4'} patient with recorded senior authorization.`
                    : `Junior RN requires authenticated senior authorization for ${code === 'JUNIOR_S4' ? 'S=4' : 'M=4'} patient.`,
                nurse_id: nurse.id, patient_id: patient.id,
            });
        }
    }

    if (patient.is_isolated && cfg.safety.requireIsolationCompetency) {
        const ok = (nurse.competencies ?? []).some(c => c.competency_code === cfg.safety.isolationCompetencyCode && isCompetencyValid(c, now));
        if (!ok) out.push({ severity: 'CRITICAL', rule_code: 'ISOLATION_POLICY', description: `${nurse.name} lacks verified ${cfg.safety.isolationCompetencyCode} for isolated patient.`, nurse_id: nurse.id, patient_id: patient.id });
    } else if (patient.is_isolated) {
        out.push({ severity: 'INFO', rule_code: 'ISOLATION_NOTE', description: 'Isolation flagged; institutional policy does not require a dedicated competency.', nurse_id: nurse.id, patient_id: patient.id });
    }
    return out;
}

export function isBlocked(violations: SafetyViolation[]): boolean { return violations.some(v => v.severity === 'CRITICAL'); }