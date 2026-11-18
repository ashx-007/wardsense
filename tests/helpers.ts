// tests/helpers.ts
import { resolveConfig } from '../src/config/index.ts';
import type { AllocationInput, Assignment, Nurse, NurseCompetency, Patient, PatientRequirement, Proficiency, Shift, Tier } from '../src/types/index.ts';
import { computeWorkload } from '../src/server/services/scoring.service.ts';

export const cfg = resolveConfig({ version: 1 });
export const NOW = new Date('2026-11-18T08:00:00Z');

export function makePatient(id: string, s: number, m: number, v: number, d: number, flags: Partial<Pick<Patient, 'admission' | 'discharge' | 'pre_op' | 'transfer' | 'is_isolated'>> = {}, requirements: PatientRequirement[] = []): Patient {
    const base = { admission: false, discharge: false, pre_op: false, transfer: false, is_isolated: false, ...flags };
    const { t, workload_score } = computeWorkload({ s, m, v, d, ...base }, cfg);
    return { id, ward_id: 'w1', bed_no: id, clinical_context: null, s, m, v, d, ...base, t, workload_score, requirements };
}
export function makeComp(code: string, level: Proficiency = 'advanced', status: NurseCompetency['verification_status'] = 'verified', expires: string | null = null): NurseCompetency {
    return { id: `c-${code}`, competency_code: code, proficiency_level: level, verification_status: status, expires_at: expires };
}
export function makeNurse(id: string, name: string, tier: Tier, opts: Partial<Nurse> = {}): Nurse {
    return { id, ward_id: 'w1', profile_id: null, name, tier, base_cap: cfg.capacity[tier], max_patients: cfg.maxPatients[tier], consecutive_shifts: 0, availability_status: 'available', is_active: true, competencies: [], ...opts };
}
export const shift: Shift = { id: 's1', ward_id: 'w1', shift_name: 'Day', start_time: NOW.toISOString(), end_time: new Date(NOW.getTime() + 8 * 36e5).toISOString(), status: 'active' };
export function approve(patientId: string, nurseId: string): Assignment {
    return { id: `a-${patientId}`, patient_id: patientId, nurse_id: nurseId, shift_id: 's1', workload_score: 0, assignment_status: 'approved' };
}
export function input(nurses: Nurse[], patients: Patient[], assignments: Assignment[] = [], authorizations: AllocationInput['authorizations'] = []): AllocationInput {
    return { shift, nurses, patients, assignments, authorizations, cfg, now: NOW };
}
export function req(code: string, level: Proficiency = 'advanced', mandatory = true): PatientRequirement {
    return { competency_code: code, required_level: level, is_mandatory: mandatory };
}