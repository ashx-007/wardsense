
// src/app/api/supervisor/safety-alerts/route.ts
import { withApi, ok, pageParams } from '../../../../lib/api.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, req }) => {
    const { from, to, page, pageSize, sp } = pageParams(req);
    let q = sb.from('safety_alerts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
    if (sp.get('severity')) q = q.eq('severity', sp.get('severity'));
    if (sp.get('status')) q = q.eq('resolution_status', sp.get('status'));
    if (sp.get('shift_id')) q = q.eq('shift_id', sp.get('shift_id'));
    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return ok({ items: data ?? [], total: count ?? 0, page, page_size: pageSize });
});