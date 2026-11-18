// src/app/api/shifts/route.ts
import { withApi, ok, parseBody } from '../../../lib/api.ts';
import { shiftCreateSchema } from '../../../lib/validation/schemas.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { createShift, listShifts } from '../../../server/repositories/shift.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb }) => {
    const { ward } = await getWard(sb);
    return ok({ items: await listShifts(sb, ward.id) });
});
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req }) => {
    const body = await parseBody(req, shiftCreateSchema);
    const { ward } = await getWard(sb);
    return ok(await createShift(sb, ward.id, body), 201);
});