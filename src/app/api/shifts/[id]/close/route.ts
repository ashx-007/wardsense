// src/app/api/shifts/[id]/close/route.ts
import { withApi, ok } from '../../../../../lib/api.ts';
export const runtime = 'nodejs';
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, params }) => {
    const { data, error } = await sb.rpc('close_shift', { p_shift_id: params.id });
    if (error) throw new Error(error.message);
    return ok(data);
});