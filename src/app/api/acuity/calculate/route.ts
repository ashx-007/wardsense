// src/app/api/acuity/calculate/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { acuitySchema } from '../../../../lib/validation/schemas.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { computeWorkload } from '../../../../server/services/scoring.service.ts';

export const runtime = 'nodejs';

export const POST = withApi({ limit: 300 }, async ({ sb, req }) => {
    const body = await parseBody(req, acuitySchema);
    const { cfg } = await getWard(sb);
    return ok(computeWorkload(body, cfg));
});
