// src/app/api/assignments/route.ts
import { withApi, ok } from '../../../lib/api.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../server/repositories/shift.repository.ts';
import { currentAssignments } from '../../../server/repositories/assignment.repository.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb }) => {
    const { ward } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    if (!shift) return ok({ shift: null, items: [] });
    const items = await currentAssignments(sb, shift.id);
    return ok({ shift, items, total: items.length });
});

