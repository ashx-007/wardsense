// src/components/analytics/analytics-client.tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import type { NurseUtilization, ResolvedConfig } from '../../types/index.ts';
import { CapacityChart, Histogram, TrendChart, UtilizationChart } from '../charts.tsx';
import { Badge, Card, Empty } from '../ui.tsx';

export function AnalyticsClient({ utils, bins, shiftTrend, alertTrend, rebalanceStats, cfg, shifts, demo }: {
    utils: NurseUtilization[];
    bins: { label: string; count: number }[];
    shiftTrend: { label: string; max: number; avg: number }[];
    alertTrend: { label: string; critical: number; warning: number }[];
    rebalanceStats: { runs: number; approved: number; avg_moves: number; avg_improvement: number };
    cfg: ResolvedConfig;
    shifts: { id: string; label: string }[];
    demo: boolean;
}) {
    const router = useRouter();
    const sp = useSearchParams();
    function setFilter(key: string, value: string) {
        const q = new URLSearchParams(sp.toString());
        if (value) q.set(key, value); else q.delete(key);
        router.push(`/analytics?${q.toString()}`);
    }
    return (
        <div className="space-y-4">
            <Card>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="label !mb-0">Filters</span>
                    <select className="input !w-56" value={sp.get('shift_id') ?? ''} onChange={e => setFilter('shift_id', e.target.value)}>
                        <option value="">Active shift (live)</option>
                        {shifts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <select className="input !w-36" value={sp.get('tier') ?? ''} onChange={e => setFilter('tier', e.target.value)}>
                        <option value="">All tiers</option><option value="junior">junior</option><option value="staff">staff</option><option value="senior">senior</option>
                    </select>
                    <label className="text-xs text-slate-500">Alerts from</label>
                    <input type="date" className="input !w-40" value={sp.get('from') ?? ''} onChange={e => setFilter('from', e.target.value)} />
                    <label className="text-xs text-slate-500">to</label>
                    <input type="date" className="input !w-40" value={sp.get('to') ?? ''} onChange={e => setFilter('to', e.target.value)} />
                    {demo && <Badge tone="amber">demo dataset — synthetic</Badge>}
                    {!demo && <Badge tone="green">recorded data</Badge>}
                </div>
            </Card>
            <div className="grid lg:grid-cols-2 gap-4">
                <Card title="Nurse workload utilization (current view)"><UtilizationChart data={utils} green={cfg.utilization.greenThreshold} amber={cfg.utilization.amberThreshold} /></Card>
                <Card title="Patient acuity distribution (W)"><Histogram bins={bins} /></Card>
                <Card title="Shift-to-shift workload comparison (closed shifts)">
                    {shiftTrend.length ? <TrendChart data={shiftTrend} series={[{ key: 'max', color: '#dc2626', name: 'Max U %' }, { key: 'avg', color: '#0d9488', name: 'Avg U %' }]} /> : <Empty>No closed shifts yet.</Empty>}
                </Card>
                <Card title="Safety alert frequency (14 days)">
                    <TrendChart data={alertTrend} series={[{ key: 'critical', color: '#dc2626', name: 'Critical' }, { key: 'warning', color: '#d97706', name: 'Warning' }]} />
                </Card>
                <Card title="Nurse adjusted capacity distribution"><CapacityChart data={utils} /></Card>
                <Card title="Rebalancing & allocation performance">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div><dt className="text-xs text-slate-500">Allocation runs</dt><dd className="text-xl font-semibold">{rebalanceStats.runs}</dd></div>
                        <div><dt className="text-xs text-slate-500">Approved</dt><dd className="text-xl font-semibold">{rebalanceStats.approved}</dd></div>
                        <div><dt className="text-xs text-slate-500">Avg moves / rebalance</dt><dd className="text-xl font-semibold">{rebalanceStats.avg_moves.toFixed(1)}</dd></div>
                        <div><dt className="text-xs text-slate-500">Avg max-U improvement</dt><dd className="text-xl font-semibold text-green-600">{(rebalanceStats.avg_improvement * 100).toFixed(1)} pp</dd></div>
                    </dl>
                    <p className="text-xs text-slate-500 mt-3">Greedy minimax heuristic; improvements are measured per run, not guaranteed optimal.</p>
                </Card>
            </div>
        </div>
    );
}