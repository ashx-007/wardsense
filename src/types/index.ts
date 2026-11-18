export type Role = 'nurse' | 'supervisor' | 'admin';
export type Tier = 'junior' | 'staff' | 'senior';
export type AvailabilityStatus = 'available' | 'unavailable' | 'on_leave' | 'off_shift' | 'restricted';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';
export type WorkloadStatus = 'green' | 'amber' | 'red';
export type Proficiency = 'basic' | 'intermediate' | 'advanced';
export type VerificationStatus = 'verified' | 'pending' | 'revoked';
export type ShiftStatus = 'scheduled' | 'active' | 'closed';
export type RunStatus = 'preview' | 'approved' | 'rejected' | 'superseded';

export interface Profile { id: string; full_name: string; role: Role; created_at: string; updated_at: string; }
export interface Ward { id: string; hospital_id: string; name: string; configuration: Record<string, unknown>; created_at: string; }

export interface CompetencyDef { code: string; name: string; }
export interface ResolvedConfig {
    version: number;
    workload: { admissionWeight: number; dischargeWeight: number; preOpWeight: number; transferWeight: number };
    capacity: Record<Tier, number>;
    maxPatients: Record<Tier, number>;
    fatigue: { consecutiveShiftThreshold: number; fatigueMultiplier: number };
    utilization: { greenThreshold: number; amberThreshold: number };
    safety: { requireIsolationCompetency: boolean; isolationCompetencyCode: string; juniorHighAcuityRequiresAuth: boolean };
    descriptors: Record<'s' | 'm' | 'v' | 'd', Record<string, string>>;
    competencyCatalog: CompetencyDef[];
    demoData: boolean;
}

export interface PatientRequirement { id?: string; patient_id?: string; competency_code: string; required_level: Proficiency; is_mandatory: boolean; }
export interface Patient {
    id: string; ward_id: string; bed_no: string; clinical_context: string | null;
    s: number; m: number; v: number; d: number;
    admission: boolean; discharge: boolean; pre_op: boolean; transfer: boolean;
    t: number; workload_score: number; is_isolated: boolean;
    created_at?: string; updated_at?: string;
    requirements: PatientRequirement[];
}
export interface NurseCompetency {
    id?: string; nurse_id?: string; competency_code: string; proficiency_level: Proficiency;
    verification_status: VerificationStatus; verified_by?: string | null; verified_at?: string | null; expires_at: string | null;
}
export interface Nurse {
    id: string; ward_id: string; profile_id: string | null; name: string; tier: Tier;
    base_cap: number; max_patients: number; consecutive_shifts: number;
    availability_status: AvailabilityStatus; is_active: boolean;
    created_at?: string; updated_at?: string;
    competencies: NurseCompetency[];
}
export interface Shift { id: string; ward_id: string; shift_name: string; start_time: string; end_time: string; status: ShiftStatus; created_at?: string; }
export interface Assignment {
    id: string; patient_id: string; nurse_id: string; shift_id: string; workload_score: number;
    assignment_status: 'approved' | 'reassigned' | 'ended';
    assigned_by?: string | null; approved_by?: string | null; approved_at?: string | null; created_at?: string;
    patient?: Patient; nurse?: Nurse;
}
export interface SeniorAuthorization { id: string; nurse_id: string; patient_id: string; shift_id: string; authorized_by: string; reason: string; created_at?: string; }
export interface SafetyViolation { severity: Severity; rule_code: string; description: string; nurse_id: string | null; patient_id: string | null; }
export interface SafetyAlertRow extends SafetyViolation { id: string; shift_id: string | null; resolution_status: 'open' | 'resolved' | 'dismissed'; resolved_by: string | null; resolved_at: string | null; created_at: string; }

export interface NurseUtilization {
    nurse_id: string; name: string; tier: Tier; patient_count: number; assigned_w: number;
    base_capacity: number; fatigue_multiplier: number; adjusted_capacity: number;
    utilization: number; status: WorkloadStatus; availability_status: AvailabilityStatus; is_active: boolean;
}
export interface ProposedAssignment {
    patient_id: string; nurse_id: string; from_nurse_id?: string;
    workload: number; projected_utilization: number; explanation: string;
}
export interface UnassignedPatient { patient_id: string; workload: number; reasons: string[]; }
export interface AllocationResult {
    algorithm_version: string; mode: 'assign' | 'rebalance';
    current: Assignment[]; proposed: ProposedAssignment[];
    unassigned: UnassignedPatient[]; ineligible_nurses: { nurse_id: string; reasons: string[] }[];
    violations: SafetyViolation[];
    before: Record<string, NurseUtilization>; after: Record<string, NurseUtilization>;
    max_before: number; max_after: number;
}
export interface AllocationRun {
    id: string; shift_id: string; algorithm_version: string; config_version: string; status: RunStatus;
    input_snapshot: Record<string, unknown>; result_snapshot: AllocationResult; created_by: string | null; created_at: string;
}
export interface AllocationInput {
    shift: Shift; nurses: Nurse[]; patients: Patient[]; assignments: Assignment[];
    authorizations: SeniorAuthorization[]; cfg: ResolvedConfig; now: Date;
}
/** Engine interface — greedy today; ILP / CP / multi-objective implementations can replace it without touching callers. */
export interface AllocationEngine { plan(input: AllocationInput): AllocationResult; }
export interface ShiftLog { id: string; shift_id: string; snapshot: NurseUtilization[]; allocation_summary: { max_u: number; avg_u: number; patient_total: number; assigned: number; unassigned: number; alerts_open: number }; created_at: string; shift?: Shift; }

export type DashboardMode = 'supervisor' | 'nurse';

export interface SessionContext {
    user: { id: string; email?: string } | null;
    profile: Profile | null;
    role: Role | null;
    linkedNurseId: string | null;
    linkedNurse: Nurse | null;
    availableModes: DashboardMode[];
    activeMode: DashboardMode;
}