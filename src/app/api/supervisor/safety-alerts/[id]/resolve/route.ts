// src/app/api/supervisor/safety-alerts/[id]/resolve/route.ts
import { withApi, ok, parseBody } from '../../../../../../lib/api.ts';
import { alertResolveSchema } from '../../../../../../lib/validation/schemas.ts';
export const runtime = 'nodejs';
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params, user }) => {
    const body = await parseBody(req, alertResolveSchema);
    const { data, error } = await sb.from('safety_alerts')
        .update({ resolution_status: body.resolution_status, resolved_by: user.id, resolved_at: new Date().toISOString() })
        .eq('id', params.id).eq('resolution_status', 'open').select().single();
    if (error) throw new Error('INVALID_STATE:alert not open or not found');
    return ok(data);
});