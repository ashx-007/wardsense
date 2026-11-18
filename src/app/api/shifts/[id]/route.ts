// src/app/api/shifts/[id]/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getShift } from '../../../../server/repositories/shift.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, params }) => ok(await getShift(sb, params.id)));