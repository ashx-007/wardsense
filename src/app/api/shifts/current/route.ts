// src/app/api/shifts/current/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../server/repositories/shift.repository.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb }) => {
    const { ward } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    return ok({ shift: shift ?? null, active: !!shift });
});

