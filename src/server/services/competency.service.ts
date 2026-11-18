import type { Nurse, NurseCompetency, PatientRequirement, Proficiency, SafetyViolation } from '../../types/index.ts';

const LEVELS: Record<Proficiency, number> = { basic: 1, intermediate: 2, advanced: 3 };

export function isCompetencyValid(c: NurseCompetency, now: Date): boolean {
    return c.verification_status === 'verified' && (!c.expires_at || new Date(c.expires_at).getTime() > now.getTime());
}

/** Senior tier does NOT imply any competency. Every requirement is checked explicitly. */
export function checkCompetencies(nurse: Nurse, requirements: PatientRequirement[], now: Date): SafetyViolation[] {
    const out: SafetyViolation[] = [];
    for (const req of requirements ?? []) {
        const sev = req.is_mandatory ? 'CRITICAL' : 'WARNING';
        const match = (nurse.competencies ?? []).find(c => c.competency_code === req.competency_code);
        const base = { nurse_id: nurse.id, patient_id: null as string | null };
        if (!match) { out.push({ ...base, severity: sev, rule_code: 'COMPETENCY_MISSING', description: `Missing competency ${req.competency_code} (requires ${req.required_level}).` }); continue; }
        if (match.verification_status !== 'verified') { out.push({ ...base, severity: sev, rule_code: 'COMPETENCY_UNVERIFIED', description: `Competency ${req.competency_code} is ${match.verification_status}, not verified.` }); continue; }
        if (match.expires_at && new Date(match.expires_at).getTime() <= now.getTime()) { out.push({ ...base, severity: sev, rule_code: 'COMPETENCY_EXPIRED', description: `Competency ${req.competency_code} expired ${match.expires_at}.` }); continue; }
        if (LEVELS[match.proficiency_level] < LEVELS[req.required_level]) out.push({ ...base, severity: sev, rule_code: 'COMPETENCY_LEVEL', description: `Competency ${req.competency_code} at ${match.proficiency_level}; ${req.required_level} required.` });
    }
    return out;
}