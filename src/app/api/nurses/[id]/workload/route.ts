// src/app/api/nurses/[id]/workload/route.ts
import { withApi, ok } from '../../../../../lib/api.ts';
import { getWard } from '../../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../../server/repositories/shift.repository.ts';
import { listNurses } from '../../../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../../../server/repositories/patient.repository.ts';
import { currentAssignments } from '../../../../../server/repositories/assignment.repository.ts';
import { wardUtilizations } from '../../../../../server/services/utilization.service.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, params, req }) => {
    const { ward, cfg } = await getWard(sb);
    const shiftId = req.nextUrl.searchParams.get('shift_id');
    const shift = shiftId ? { id: shiftId } : await getActiveShift(sb, ward.id);
    const [nurses, { items: patients }, assignments] = await Promise.all([
        listNurses(sb, ward.id), listPatients(sb, ward.id),
        shift ? currentAssignments(sb, shift.id) : Promise.resolve([]),
    ]);
    const utils = wardUtilizations(nurses, patients, assignments, shift?.id ?? null, cfg);
    const u = utils.find(x => x.nurse_id === params.id);
    if (!u) throw new Error('NOT_FOUND:nurse');
    return ok({ ...u, patients: assignments.filter(a => a.nurse_id === params.id).map(a => a.patient) });
});
