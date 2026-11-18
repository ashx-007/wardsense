// src/app/api/patients/[id]/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { patientPatchSchema } from '../../../../lib/validation/schemas.ts';
import { deletePatient, getPatient, updatePatient } from '../../../../server/repositories/patient.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, params }) => ok(await getPatient(sb, params.id)));
export const PATCH = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params }) =>
    ok(await updatePatient(sb, params.id, await parseBody(req, patientPatchSchema))));
export const DELETE = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, params }) => {
    await deletePatient(sb, params.id);
    return ok({ deleted: params.id });
});