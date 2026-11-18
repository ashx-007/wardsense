// src/app/api/supervisor/dashboard/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../server/repositories/shift.repository.ts';
import { listNurses } from '../../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../../server/repositories/patient.repository.ts';
import { currentAssignments, latestRun } from '../../../../server/repositories/assignment.repository.ts';
import { wardStats, wardUtilizations } from '../../../../server/services/utilization.service.ts';
export const runtime = 'nodejs';
export const GET = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb }) => {
    const { ward, cfg } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    const [nurses, { items: patients }] = await Promise.all([listNurses(sb, ward.id), listPatients(sb, ward.id)]);
    const assignments = shift ? await currentAssignments(sb, shift.id) : [];
    const utils = wardUtilizations(nurses, patients, assignments, shift?.id ?? null, cfg);
    const { data: alerts } = await sb.from('safety_alerts').select('*').eq('resolution_status', 'open').order('created_at', { ascending: false }).limit(20);
    return ok({
        shift, nurses: utils, ward: wardStats(patients, assignments, shift?.id ?? null, utils, cfg),
        critical_alerts: (alerts ?? []).filter(a => a.severity === 'CRITICAL'),
        open_alerts: alerts ?? [],
        latest_run: shift ? await latestRun(sb, shift.id) : null,
    });
});
