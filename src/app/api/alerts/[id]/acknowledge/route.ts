// src/app/api/alerts/[id]/acknowledge/route.ts
import { withApi, ok, parseBody } from '../../../../../lib/api.ts';
import { alertResolveSchema } from '../../../../../lib/validation/schemas.ts';

export const runtime = 'nodejs';

export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params, user }) => {
    const { resolution_status } = await parseBody(req, alertResolveSchema);
    const { data, error } = await sb
        .from('safety_alerts')
        .update({ resolution_status, resolved_by: user.id, resolved_at: new Date().toISOString() })
        .eq('id', params.id)
        .select()
        .single();
    if (error) throw new Error(error.message);
    return ok(data);
});

