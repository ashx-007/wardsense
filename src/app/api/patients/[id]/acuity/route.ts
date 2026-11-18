// src/app/api/patients/[id]/acuity/route.ts
import { withApi, ok } from '../../../../../lib/api.ts';
import { getPatient } from '../../../../../server/repositories/patient.repository.ts';
import { getWard } from '../../../../../server/repositories/ward.repository.ts';
import { computeWorkload } from '../../../../../server/services/scoring.service.ts';
export const runtime = 'nodejs';
export const GET = withApi({}, async ({ sb, params }) => {
    const p = await getPatient(sb, params.id);
    const { cfg } = await getWard(sb);
    return ok({ patient_id: p.id, stored: { t: p.t, workload_score: p.workload_score }, recomputed: computeWorkload(p, cfg), descriptors: cfg.descriptors });
});