
// src/app/api/utilization/overview/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { getActiveShift, getShift } from '../../../../server/repositories/shift.repository.ts';
import { listNurses } from '../../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../../server/repositories/patient.repository.ts';
import { currentAssignments } from '../../../../server/repositories/assignment.repository.ts';
import { wardStats, wardUtilizations } from '../../../../server/services/utilization.service.ts';
export const runtime = 'nodejs';
export const GET = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req }) => {
    const { ward, cfg } = await getWard(sb);
    const shiftId = req.nextUrl.searchParams.get('shift_id');
    const shift = shiftId ? await getShift(sb, shiftId) : await getActiveShift(sb, ward.id);
    const tier = req.nextUrl.searchParams.get('tier');
    const [nurses, { items: patients }] = await Promise.all([listNurses(sb, ward.id), listPatients(sb, ward.id)]);
    const assignments = shift ? await currentAssignments(sb, shift.id) : [];
    const filtered = tier ? nurses.filter(n => n.tier === tier) : nurses;
    const utils = wardUtilizations(filtered, patients, assignments, shift?.id ?? null, cfg);
    return ok({ shift, nurses: utils, ward: wardStats(patients, assignments, shift?.id ?? null, utils, cfg) });
});