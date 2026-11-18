import type { Nurse, SafetyViolation, Shift } from '../../types/index.ts';

export function checkAvailability(nurse: Nurse, shift: Shift): SafetyViolation[] {
    const out: SafetyViolation[] = [];
    const base = { nurse_id: nurse.id, patient_id: null as string | null };
    if (!nurse.is_active) out.push({ ...base, severity: 'CRITICAL', rule_code: 'NURSE_INACTIVE', description: `${nurse.name} is inactive.` });
    if (nurse.availability_status !== 'available') out.push({ ...base, severity: 'CRITICAL', rule_code: 'NURSE_UNAVAILABLE', description: `${nurse.name} is ${nurse.availability_status} for this shift.` });
    if (shift.status !== 'active') out.push({ ...base, severity: 'CRITICAL', rule_code: 'SHIFT_MISMATCH', description: `Shift is ${shift.status}; allocations require an active shift.` });
    return out;
}