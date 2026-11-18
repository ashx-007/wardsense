// src/app/(app)/analytics/page.tsx
import { redirect } from 'next/navigation';
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { getActiveShift, listShifts } from '../../../server/repositories/shift.repository.ts';
import { listNurses } from '../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../server/repositories/patient.repository.ts';
import { currentAssignments, listRuns } from '../../../server/repositories/assignment.repository.ts';
import { wardUtilizations } from '../../../server/services/utilization.service.ts';
import { computeWorkload } from '../../../server/services/scoring.service.ts';
import { AnalyticsClient } from '../../../components/analytics/analytics-client.tsx';
import type { ShiftLog } from '../../../types/index.ts';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams;
    const sb = await serverClient();
    const { role } = await getSession(sb);
    if (role !== 'supervisor' && role !== 'admin') redirect('/dashboard');
    const { ward, cfg } = await getWard(sb);
    const shifts = await listShifts(sb, ward.id);
    const shift = sp.shift_id ? shifts.find(s => s.id === sp.shift_id) ?? null : await getActiveShift(sb, ward.id);
    const [allNurses, { items: patients }] = await Promise.all([listNurses(sb, ward.id), listPatients(sb, ward.id)]);
    const nurses = sp.tier ? allNurses.filter(n => n.tier === sp.tier) : allNurses;

    let assignments = shift && shift.status !== 'closed' ? await currentAssignments(sb, shift.id) : [];
    let utils = wardUtilizations(nurses, patients, assignments, shift?.id ?? null, cfg);
    const { data: logs } = await sb.from('shift_logs').select('*, shift:shifts(*)').order('created_at', { ascending: false }).limit(20);
    const shiftLogs = (logs ?? []) as ShiftLog[];
    if (shift?.status === 'closed') {
        const log = shiftLogs.find(l => l.shift_id === shift.id);
        if (log) utils = (log.snapshot as typeof utils).filter(u => !sp.tier || u.tier === sp.tier);
    }

    const binsDef = [[4, 8], [9, 12], [13, 16], [17, 20], [21, 26]] as const;
    const ws = patients.map(p => computeWorkload(p, cfg).workload_score);
    const bins = binsDef.map(([lo, hi]) => ({ label: `${lo}–${hi}`, count: ws.filter(w => w >= lo && w <= hi).length }));

    const shiftTrend = [...shiftLogs].reverse().map(l => ({
        label: `${l.shift?.shift_name ?? 'shift'} · ${new Date(l.created_at).toLocaleDateString()}`,
        max: +(l.allocation_summary.max_u * 100).toFixed(1), avg: +(l.allocation_summary.avg_u * 100).toFixed(1),
    }));

    let aq = sb.from('safety_alerts').select('severity, created_at').gte('created_at', new Date(Date.now() - 14 * 864e5).toISOString());
    if (sp.from) aq = aq.gte('created_at', new Date(sp.from).toISOString());
    if (sp.to) aq = aq.lte('created_at', new Date(sp.to + 'T23:59:59').toISOString());
    const { data: alertRows } = await aq;
    const days = new Map<string, { critical: number; warning: number }>();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 864e5);
        days.set(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), { critical: 0, warning: 0 });
    }
    for (const a of alertRows ?? []) {
        const key = new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const bucket = days.get(key);
        if (bucket) { if (a.severity === 'CRITICAL') bucket.critical++; else if (a.severity === 'WARNING') bucket.warning++; }
    }
    const alertTrend = [...days.entries()].map(([label, v]) => ({ label, ...v }));

    const { items: runs } = await listRuns(sb, { from: 0, to: 99 });
    const rebalances = runs.filter(r => r.result_snapshot?.mode === 'rebalance');
    const rebalanceStats = {
        runs: runs.length,
        approved: runs.filter(r => r.status === 'approved').length,
        avg_moves: rebalances.length ? rebalances.reduce((s, r) => s + r.result_snapshot.proposed.filter(p => p.from_nurse_id).length, 0) / rebalances.length : 0,
        avg_improvement: rebalances.length ? rebalances.reduce((s, r) => s + Math.max(0, r.result_snapshot.max_before - r.result_snapshot.max_after), 0) / rebalances.length : 0,
    };

    return (
        <AnalyticsClient
            utils={utils} bins={bins} shiftTrend={shiftTrend} alertTrend={alertTrend} rebalanceStats={rebalanceStats}
            cfg={cfg} demo={cfg.demoData}
            shifts={shifts.map(s => ({ id: s.id, label: `${s.shift_name} · ${new Date(s.start_time).toLocaleDateString()} (${s.status})` }))}
        />
    );
}