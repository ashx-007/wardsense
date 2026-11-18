// src/app/api/wards/[id]/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { z } from 'zod';

const patchSchema = z.object({ name: z.string().min(1).max(120).optional(), configuration: z.record(z.string(), z.unknown()).optional() });

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb, params }) => {
    const { data, error } = await sb.from('wards').select('*').eq('id', params.id).single();
    if (error || !data) throw new Error('NOT_FOUND:ward');
    return ok(data);
});

export const PATCH = withApi({ roles: ['admin'] }, async ({ sb, req, params }) => {
    const body = await parseBody(req, patchSchema);
    const { data, error } = await sb.from('wards').update(body).eq('id', params.id).select().single();
    if (error) throw error;
    return ok(data);
});

