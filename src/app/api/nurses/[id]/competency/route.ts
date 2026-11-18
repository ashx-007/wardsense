// src/app/api/nurses/[id]/competencies/route.ts
import { withApi, ok, parseBody } from '../../../../../lib/api.ts';
import { competencyCreateSchema, competencyPatchSchema } from '../../../../../lib/validation/schemas.ts';
import { getNurse } from '../../../../../server/repositories/nurse.repository.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, params }) => ok({ items: (await getNurse(sb, params.id)).competencies }));
export const POST = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params, user }) => {
    const body = await parseBody(req, competencyCreateSchema);
    const status = body.verification_status ?? 'pending';
    const { data, error } = await sb.from('nurse_competencies').insert({
        nurse_id: params.id, ...body, verification_status: status,
        verified_by: status === 'verified' ? user.id : null, verified_at: status === 'verified' ? new Date().toISOString() : null,
    }).select().single();
    if (error) throw error;
    return ok(data, 201);
});
export const PATCH = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params, user }) => {
    const { id, ...body } = await parseBody(req, competencyPatchSchema);
    const patch: Record<string, unknown> = { ...body };
    if (body.verification_status === 'verified') { patch.verified_by = user.id; patch.verified_at = new Date().toISOString(); }
    const { data, error } = await sb.from('nurse_competencies').update(patch).eq('id', id).eq('nurse_id', params.id).select().single();
    if (error) throw error;
    return ok(data);
});
export const DELETE = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params }) => {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new Error('INVALID_:competency id required');
    const { error } = await sb.from('nurse_competencies').delete().eq('id', id).eq('nurse_id', params.id);
    if (error) throw error;
    return ok({ deleted: id });
});