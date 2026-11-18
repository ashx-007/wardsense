// src/app/api/nurses/[id]/fatigue/route.ts
import { withApi, ok, parseBody } from '../../../../../lib/api.ts';
import { z } from 'zod';
import { getNurse, updateNurse } from '../../../../../server/repositories/nurse.repository.ts';
import { fatigueMultiplier } from '../../../../../server/services/fatigue.service.ts';
import { getWard } from '../../../../../server/repositories/ward.repository.ts';

const schema = z.object({ consecutive_shifts: z.number().int().min(0).max(30) });

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb, params }) => {
    const { cfg } = await getWard(sb);
    const nurse = await getNurse(sb, params.id);
    const mult = fatigueMultiplier(nurse.consecutive_shifts, cfg);
    return ok({
        nurse_id: nurse.id, name: nurse.name,
        consecutive_shifts: nurse.consecutive_shifts,
        fatigue_multiplier: mult,
        is_fatigued: mult < 1.0,
        adjusted_capacity: nurse.base_cap * mult,
    });
});

export const PATCH = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb, req, params }) => {
    const body = await parseBody(req, schema);
    const nurse = await updateNurse(sb, params.id, body);
    const { cfg } = await getWard(sb);
    const mult = fatigueMultiplier(nurse.consecutive_shifts, cfg);
    return ok({ nurse_id: nurse.id, consecutive_shifts: nurse.consecutive_shifts, fatigue_multiplier: mult });
});

