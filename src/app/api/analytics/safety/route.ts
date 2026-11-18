// src/app/api/analytics/safety/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../../server/repositories/shift.repository.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb }) => {
    const { ward } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);

    const { data: open, error: oe } = await sb.from('safety_alerts').select('*').eq('resolution_status', 'open');
    if (oe) throw new Error(oe.message);
    const { data: resolved, error: re } = await sb.from('safety_alerts').select('*').eq('resolution_status', 'resolved');
    if (re) throw new Error(re.message);

    const byRule = (open ?? []).reduce<Record<string, number>>((acc, a) => {
        acc[a.rule_code] = (acc[a.rule_code] ?? 0) + 1;
        return acc;
    }, {});
    const bySeverity = (open ?? []).reduce<Record<string, number>>((acc, a) => {
        acc[a.severity] = (acc[a.severity] ?? 0) + 1;
        return acc;
    }, {});

    return ok({
        shift,
        open_count: open?.length ?? 0,
        resolved_count: resolved?.length ?? 0,
        by_rule: byRule,
        by_severity: bySeverity,
        recent_open: (open ?? []).slice(0, 10),
    });
});

