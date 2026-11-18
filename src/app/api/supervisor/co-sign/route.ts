
// src/app/api/supervisor/co-sign/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { coSignSchema } from '../../../../lib/validation/schemas.ts';
export const runtime = 'nodejs';
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req }) => {
    const b = await parseBody(req, coSignSchema);
    const { data, error } = await sb.rpc('co_sign_assignment', { p_nurse_id: b.nurse_id, p_patient_id: b.patient_id, p_shift_id: b.shift_id, p_reason: b.reason });
    if (error) throw new Error(error.message);
    return ok(data, 201);
});