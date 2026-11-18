// src/app/api/assignments/[id]/route.ts
import { withApi, ok } from '../../../../lib/api.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb, params }) => {
    const { data, error } = await sb
        .from('assignments')
        .select('*, patient:patients(*, requirements:patient_requirements(*)), nurse:nurses(*, competencies:nurse_competencies(*))')
        .eq('id', params.id)
        .single();
    if (error || !data) throw new Error('NOT_FOUND:assignment');
    return ok(data);
});

export const DELETE = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, params }) => {
    const { data: a, error: fe } = await sb.from('assignments').select('id, assignment_status').eq('id', params.id).single();
    if (fe || !a) throw new Error('NOT_FOUND:assignment');
    if (a.assignment_status !== 'approved') throw new Error('INVALID_STATE:only approved assignments can be ended.');
    const { error } = await sb.from('assignments').update({ assignment_status: 'ended' }).eq('id', params.id);
    if (error) throw error;
    return ok({ message: 'Assignment ended.' });
});

