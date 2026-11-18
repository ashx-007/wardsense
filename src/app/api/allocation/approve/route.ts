// src/app/api/allocation/approve/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { runIdSchema } from '../../../../lib/validation/schemas.ts';
export const runtime = 'nodejs';
export const POST = withApi({ roles: ['supervisor', 'admin'], limit: 20 }, async ({ sb, req }) => {
    const { run_id } = await parseBody(req, runIdSchema);
    const { data, error } = await sb.rpc('approve_allocation_run', { p_run_id: run_id });
    if (error) throw new Error(error.message);
    return ok(data);
});