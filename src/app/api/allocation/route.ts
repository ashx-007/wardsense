// src/app/api/allocation/route.ts
import { withApi, ok, pageParams } from '../../../lib/api.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../server/repositories/shift.repository.ts';
import { listRuns } from '../../../server/repositories/assignment.repository.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb, req }) => {
    const { from, to, sp } = pageParams(req);
    const { ward } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    const shiftId = sp.get('shift_id') ?? shift?.id;
    const { items, total } = await listRuns(sb, { from, to }, shiftId);
    return ok({ items, total, active_shift: shift });
});
