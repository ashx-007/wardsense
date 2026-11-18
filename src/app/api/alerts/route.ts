// src/app/api/alerts/route.ts
import { withApi, ok, pageParams } from '../../../lib/api.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../server/repositories/shift.repository.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb, req }) => {
    const { from, to, sp } = pageParams(req);
    const { ward } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    const status = sp.get('status') ?? 'open';

    let q = sb.from('safety_alerts').select('*', { count: 'exact' }).eq('resolution_status', status).order('created_at', { ascending: false }).range(from, to);
    if (shift) q = q.eq('shift_id', shift.id);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return ok({ items: data ?? [], total: count ?? 0, shift });
});

