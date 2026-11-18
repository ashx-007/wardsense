// src/app/api/nurses/[id]/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { nursePatchSchema } from '../../../../lib/validation/schemas.ts';
import { deleteNurse, getNurse, updateNurse } from '../../../../server/repositories/nurse.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, params }) => ok(await getNurse(sb, params.id)));
export const PATCH = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params }) =>
    ok(await updateNurse(sb, params.id, await parseBody(req, nursePatchSchema))));
export const DELETE = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, params }) => {
    await deleteNurse(sb, params.id);
    return ok({ deleted: params.id });
});