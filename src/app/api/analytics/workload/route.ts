// src/app/api/analytics/workload/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../server/repositories/shift.repository.ts';
import { wardUtilizations, wardStats } from '../../../../server/services/utilization.service.ts';
import type { Nurse, Patient, Assignment } from '../../../../types/index.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb }) => {
    const { ward, cfg } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);

    const [nursesRes, patientsRes, assignmentsRes] = await Promise.all([
        sb.from('nurses').select('*, competencies:nurse_competencies(*)').eq('ward_id', ward.id),
        sb.from('patients').select('*, requirements:patient_requirements(*)').eq('ward_id', ward.id),
        sb.from('assignments').select('*').eq('assignment_status', 'approved'),
    ]);
    if (nursesRes.error) throw new Error(nursesRes.error.message);
    if (patientsRes.error) throw new Error(patientsRes.error.message);
    if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);

    const nurses = (nursesRes.data ?? []) as Nurse[];
    const patients = (patientsRes.data ?? []) as Patient[];
    const assignments = (assignmentsRes.data ?? []) as Assignment[];

    const utils = wardUtilizations(nurses, patients, assignments, shift?.id ?? null, cfg);
    const stats = wardStats(patients, assignments, shift?.id ?? null, utils, cfg);

    return ok({ shift, utilizations: utils, stats });
});

