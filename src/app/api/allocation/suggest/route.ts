// src/app/api/allocation/suggest/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getWard, loadAllocationInput } from '../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../server/repositories/shift.repository.ts';
import { insertRun, persistAlerts } from '../../../../server/repositories/assignment.repository.ts';
import { planAllocation } from '../../../../server/services/allocation.service.ts';
import { configVersionLabel } from '../../../../config/index.ts';

export const runtime = 'nodejs';

export const POST = withApi({ roles: ['supervisor', 'admin'], limit: 20 }, async ({ sb, user }) => {
    const { ward, cfg } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    if (!shift) throw new Error('NO_ACTIVE_SHIFT');
    const input = await loadAllocationInput(sb, shift);
    const result = planAllocation(input);
    const run = await insertRun(sb, shift.id, user.id, configVersionLabel(cfg, ward.id), result, {
        config_version: configVersionLabel(cfg, ward.id),
        patients: input.patients.map(p => ({ id: p.id, W: p.workload_score })),
        approved_assignments: input.assignments.map(a => ({ patient_id: a.patient_id, nurse_id: a.nurse_id })),
    });
    const alertsCreated = await persistAlerts(sb, shift.id, result.violations);
    return ok({ run, result, alerts_created: alertsCreated }, 201);
});

