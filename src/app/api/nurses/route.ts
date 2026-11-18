// src/app/api/nurses/route.ts
import { withApi, ok, parseBody } from '../../../lib/api.ts';
import { nurseCreateSchema } from '../../../lib/validation/schemas.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { createNurse, listNurses } from '../../../server/repositories/nurse.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb }) => {
    const { ward } = await getWard(sb);
    return ok({ items: await listNurses(sb, ward.id) });
});
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req }) => {
    const body = await parseBody(req, nurseCreateSchema);
    const { ward, cfg } = await getWard(sb);
    return ok(await createNurse(sb, ward.id, body, cfg), 201);
});