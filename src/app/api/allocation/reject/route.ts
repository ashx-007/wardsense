// src/app/api/allocation/reject/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { rejectSchema } from '../../../../lib/validation/schemas.ts';
export const runtime = 'nodejs';
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req }) => {
    const { run_id, reason } = await parseBody(req, rejectSchema);
    const { data, error } = await sb.rpc('reject_allocation_run', { p_run_id: run_id, p_reason: reason });
    if (error) throw new Error(error.message);
    return ok(data);
});