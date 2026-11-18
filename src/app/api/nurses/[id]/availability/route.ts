// src/app/api/nurses/[id]/availability/route.ts
import { withApi, ok, parseBody } from '../../../../../lib/api.ts';
import { z } from 'zod';
import { getNurse, updateNurse } from '../../../../../server/repositories/nurse.repository.ts';

const schema = z.object({
    availability_status: z.enum(['available', 'unavailable', 'on_leave', 'off_shift', 'restricted']),
});

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb, params }) => {
    const nurse = await getNurse(sb, params.id);
    return ok({ nurse_id: nurse.id, name: nurse.name, availability_status: nurse.availability_status, is_active: nurse.is_active });
});

export const PATCH = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params }) => {
    const body = await parseBody(req, schema);
    const nurse = await updateNurse(sb, params.id, body);
    return ok({ nurse_id: nurse.id, name: nurse.name, availability_status: nurse.availability_status });
});

