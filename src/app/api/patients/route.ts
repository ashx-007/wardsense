// src/app/api/patients/route.ts
import { withApi, ok, parseBody, pageParams } from '../../../lib/api.ts';
import { patientCreateSchema } from '../../../lib/validation/schemas.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { createPatient, listPatients } from '../../../server/repositories/patient.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, req }) => {
    const { ward } = await getWard(sb);
    const { from, to, page, pageSize, sp } = pageParams(req);
    const paged = sp.has('page');
    const { items, total } = await listPatients(sb, ward.id, paged ? { from, to } : undefined);
    return ok(paged ? { items, total, page, page_size: pageSize } : { items, total });
});
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req }) => {
    const body = await parseBody(req, patientCreateSchema);
    const { ward } = await getWard(sb);
    return ok(await createPatient(sb, ward.id, body), 201);
});