// src/app/api/allocation/history/route.ts
import { withApi, ok, pageParams } from '../../../../lib/api.ts';
import { listRuns } from '../../../../server/repositories/assignment.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req }) => {
    const { from, to, page, pageSize, sp } = pageParams(req);
    const { items, total } = await listRuns(sb, { from, to }, sp.get('shift_id') ?? undefined);
    return ok({ items, total, page, page_size: pageSize });
});
