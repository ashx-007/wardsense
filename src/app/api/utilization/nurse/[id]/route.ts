// src/app/api/utilization/nurse/[id]/route.ts
import { withApi, ok } from '../../../../../lib/api.ts';
import { getNurse } from '../../../../../server/repositories/nurse.repository.ts';
import { getWard } from '../../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../../server/repositories/shift.repository.ts';
import { nurseUtilization } from '../../../../../server/services/utilization.service.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb, params }) => {
    const { cfg } = await getWard(sb);
    const nurse = await getNurse(sb, params.id);
    const shift = await getActiveShift(sb, nurse.ward_id);
    const { data: assignments } = await sb.from('assignments').select('*, patient:patients(*)').eq('nurse_id', params.id).eq('assignment_status', 'approved');
    const assignedW = (assignments ?? []).reduce((s: number, a: { workload_score?: number }) => s + (a.workload_score ?? 0), 0);
    const patientCount = (assignments ?? []).length;
    const util = nurseUtilization(nurse, assignedW, patientCount, cfg);
    return ok({ shift, nurse_id: nurse.id, name: nurse.name, utilization: util, assignments: assignments ?? [] });
});
