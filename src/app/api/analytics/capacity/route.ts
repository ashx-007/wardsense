// src/app/api/analytics/capacity/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../server/repositories/shift.repository.ts';
import { adjustedCapacity } from '../../../../server/services/capacity.service.ts';
import type { Nurse } from '../../../../types/index.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb }) => {
    const { ward, cfg } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    const { data, error } = await sb.from('nurses').select('*, competencies:nurse_competencies(*)').eq('ward_id', ward.id).eq('is_active', true);
    if (error) throw new Error(error.message);
    const nurses = (data ?? []) as Nurse[];
    const capacity = nurses.map(n => ({
        nurse_id: n.id, name: n.name, tier: n.tier,
        base_cap: n.base_cap, consecutive_shifts: n.consecutive_shifts,
        adjusted_cap: adjustedCapacity(n, cfg),
        availability_status: n.availability_status,
    }));
    const totalCap = capacity.reduce((s, c) => s + c.adjusted_cap, 0);
    return ok({ shift, capacity, total_adjusted_capacity: totalCap, nurse_count: nurses.length });
});

