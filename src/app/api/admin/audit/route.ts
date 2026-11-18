// src/app/api/admin/audit/route.ts
import { withApi, ok, pageParams } from '../../../../lib/api.ts';
export const runtime = 'nodejs';
export const GET = withApi({ roles: ['admin'] }, async ({ sb, req }) => {
    const { from, to, page, pageSize } = pageParams(req);
    const { data, error, count } = await sb.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    return ok({ items: data ?? [], total: count ?? 0, page, page_size: pageSize });
});
