// Central workload configuration. Demo descriptors are institutional placeholders — NOT official TISS definitions.
export const workloadDefaults = { admissionWeight: 3, dischargeWeight: 3, preOpWeight: 2, transferWeight: 2 };

export const defaultDescriptors: Record<'s' | 'm' | 'v' | 'd', Record<string, string>> = {
    s: { 1: 'Stable, routine observation (institution-defined)', 2: 'Mostly stable, periodic reassessment', 3: 'Unstable risk, frequent reassessment', 4: 'Unstable, continuous close observation' },
    m: { 1: 'Oral/simple meds', 2: 'Multiple scheduled meds', 3: 'Complex schedules or titration', 4: 'High-risk IV/infusion regimen' },
    v: { 1: 'Routine vitals', 2: '4-hourly vitals', 3: '1–2 hourly vitals', 4: 'Continuous monitoring' },
    d: { 1: 'Independent', 2: 'Partial assist', 3: 'Full assist, two-person tasks', 4: 'Total care, immobile' },
};