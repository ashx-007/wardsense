// src/components/allocation/allocation-client.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AllocationRun, Nurse, Patient, Role, Shift } from '../../types/index.ts';
import { api, Badge, Card, Empty, ErrorNote, Modal, UtilBar, pct } from '../ui.tsx';

export function AllocationClient({ run, shift, nurses, patients, role }: { run: AllocationRun | null; shift: Shift | null; nurses: Nurse[]; patients: Patient[]; role: Role }) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const nurseName = (id: string) => nurses.find(n => n.id === id)?.name ?? id.slice(0, 8);
    const bed = (id: string) => patients.find(p => p.id === id)?.bed_no ?? id.slice(0, 8);
    const result = run?.result_snapshot;

    async function act(kind: 'preview' | 'rebalance' | 'approve' | 'reject') {
        setBusy(kind); setError(null);
        try {
            if (kind === 'preview') await api('/api/allocation/preview', 'POST');
            else if (kind === 'rebalance') await api('/api/allocation/rebalance', 'POST');
            else if (kind === 'approve') await api('/api/allocation/approve', 'POST', { run_id: run!.id });
            else { await api('/api/allocation/reject', 'POST', { run_id: run!.id, reason }); setRejecting(false); setReason(''); }
            router.refresh();
        } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
        finally { setBusy(null); }
    }

    const canApprove = run?.status === 'preview' && shift?.status === 'active' && (role === 'supervisor' || role === 'admin');

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex flex-wrap items-center gap-3">
                    <button className="btn-primary" onClick={() => act('preview')} disabled={busy !== null || !shift}>
                        {busy === 'preview' ? 'Computing…' : 'Generate allocation preview'}
                    </button>
                    <button className="btn-blue" onClick={() => act('rebalance')} disabled={busy !== null || !shift}>
                        {busy === 'rebalance' ? 'Rebalancing…' : 'Smart rebalance preview'}
                    </button>
                    {run && (
                        <>
                            <Badge tone={run.status === 'approved' ? 'green' : run.status === 'preview' ? 'blue' : run.status === 'rejected' ? 'red' : 'slate'}>{run.status}</Badge>
                            <span className="text-xs text-slate-500">{run.algorithm_version} · config {run.config_version} · {new Date(run.created_at).toLocaleString()}</span>
                            <div className="ml-auto flex gap-2">
                                <button className="btn-primary" onClick={() => act('approve')} disabled={!canApprove || busy !== null}>{busy === 'approve' ? 'Approving…' : 'Approve'}</button>
                                <button className="btn-ghost" onClick={() => setRejecting(true)} disabled={!canApprove || busy !== null}>Reject</button>
                            </div>
                        </>
                    )}
                </div>
                {!shift && <p className="mt-2 text-sm text-amber-700">No active shift. Activate a shift in Shift Management first.</p>}
                <p className="mt-2 text-xs text-slate-500">Previews never change assignments. Approval re-validates every safety rule inside a single database transaction.</p>
                <ErrorNote error={error} />
            </Card>

            {result && (
                <>
                    <div className="grid sm:grid-cols-3 gap-4">
                        <Card title="Ward max utilization">
                            <p className="text-2xl font-semibold">{pct(result.max_before)} → <span className={result.max_after < result.max_before ? 'text-green-600' : ''}>{pct(result.max_after)}</span></p>
                            <p className="text-xs text-slate-500 mt-1">Greedy minimax heuristic — not a guaranteed global optimum.</p>
                        </Card>
                        <Card title="Recommendations"><p className="text-2xl font-semibold">{result.proposed.length}</p><p className="text-xs text-slate-500">{result.proposed.filter(p => p.from_nurse_id).length} moves · {result.proposed.filter(p => !p.from_nurse_id).length} new placements</p></Card>
                        <Card title="Unassigned patients"><p className="text-2xl font-semibold">{result.unassigned.length}</p><p className="text-xs text-slate-500">with blocking reasons below</p></Card>
                    </div>

                    <Card title="Proposed assignments (before → after)">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px]">
                                <thead><tr><th className="th">Bed</th><th className="th">W</th><th className="th">From</th><th className="th">To</th><th className="th">Projected U</th><th className="th">Why</th></tr></thead>
                                <tbody>
                                    {result.proposed.map(p => (
                                        <tr key={p.patient_id}>
                                            <td className="td font-medium">{bed(p.patient_id)}</td>
                                            <td className="td">{p.workload}</td>
                                            <td className="td">{p.from_nurse_id ? nurseName(p.from_nurse_id) : <Badge tone="blue">unassigned</Badge>}</td>
                                            <td className="td font-medium">{nurseName(p.nurse_id)}</td>
                                            <td className="td tabular-nums">{pct(p.projected_utilization)}</td>
                                            <td className="td text-xs text-slate-600">{p.explanation}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {result.proposed.length === 0 && <Empty>No changes recommended.</Empty>}
                        </div>
                    </Card>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card title="Utilization before / after">
                            <table className="w-full">
                                <thead><tr><th className="th">Nurse</th><th className="th">Before</th><th className="th">After</th></tr></thead>
                                <tbody>
                                    {Object.values(result.after).map(u => (
                                        <tr key={u.nurse_id}>
                                            <td className="td font-medium">{u.name}<span className="text-xs text-slate-400 ml-1">{u.assigned_w}/{u.adjusted_capacity.toFixed(1)}</span></td>
                                            <td className="td"><UtilBar u={result.before[u.nurse_id]?.utilization ?? 0} status={result.before[u.nurse_id]?.status ?? 'green'} /></td>
                                            <td className="td"><UtilBar u={u.utilization} status={u.status} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                        <div className="space-y-4">
                            <Card title="Unassigned patients">
                                {result.unassigned.length === 0 ? <Empty>All patients placed.</Empty> : result.unassigned.map(u => (
                                    <div key={u.patient_id} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                                        <span className="text-sm font-medium">Bed {bed(u.patient_id)} (W={u.workload})</span>
                                        <span className="text-xs text-red-600 text-right">{u.reasons.join(' · ') || 'no eligible nurses'}</span>
                                    </div>
                                ))}
                            </Card>
                            <Card title="Safety violations in this run">
                                {result.violations.length === 0 ? <Empty>None.</Empty> : result.violations.map((v, i) => (
                                    <div key={i} className="py-1.5 border-b border-slate-100 last:border-0 text-sm flex gap-2">
                                        <Badge tone={v.severity}>{v.severity}</Badge>
                                        <span className="text-xs text-slate-600"><b>{v.rule_code}</b> — {v.description}</span>
                                    </div>
                                ))}
                            </Card>
                        </div>
                    </div>
                </>
            )}
            {!run && <Card><Empty>No allocation runs yet for this shift. Generate a preview to begin.</Empty></Card>}

            <Modal open={rejecting} onClose={() => setRejecting(false)} title="Reject recommendation">
                <label className="label">Reason (audited)</label>
                <textarea className="input" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this recommendation rejected?" />
                <ErrorNote error={error} />
                <div className="mt-3 flex justify-end gap-2">
                    <button className="btn-ghost" onClick={() => setRejecting(false)}>Cancel</button>
                    <button className="btn-danger" disabled={reason.trim().length < 4 || busy !== null} onClick={() => act('reject')}>Reject run</button>
                </div>
            </Modal>
        </div>
    );
}