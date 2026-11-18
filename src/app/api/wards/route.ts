// src/app/api/wards/route.ts
import { withApi, ok } from '../../../lib/api.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb }) => {
    const { data, error } = await sb.from('wards').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return ok({ items: data ?? [] });
});

