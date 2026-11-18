// src/components/alerts/alerts-client.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Nurse, Patient, Role, SafetyAlertRow } from '../../types/index.ts';
import { api, Badge, Card, Empty, ErrorNote, Modal } from '../ui.tsx';

export function AlertsClient({ alerts, nurses, patients, role }: { alerts: SafetyAlertRow[]; nurses: Nurse[]; patients: Patient[]; role: Role }) {
    const router = useRouter();
    const [severity, setSeverity] = useState(''); const [status, setStatus] = useState('open');
    const [resolving, setResolving] = useState<SafetyAlertRow | null>(null);
    const [cosigning, setCosigning] = useState<SafetyAlertRow | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
    const staff = role === 'supervisor' || role === 'admin';
    const nurseName = (id: string | null) => nurses.find(n => n.id === id)?.name ?? '—';
    const bed = (id: string | null) => patients.find(p => p.id === id)?.bed_no ?? '—';
    const filtered = alerts.filter(a => (!severity || a.severity === severity) && (!status || a.resolution_status === status));

    async function resolve() {
        if (!resolving) return;
        setBusy(true); setError(null);
        try { await api(`/api/supervisor/safety-alerts/${resolving.id}/resolve`, 'POST', { resolution_status: 'resolved', reason }); setResolving(null); setReason(''); router.refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        finally { setBusy(false); }
    }
    async function cosign() {
        if (!cosigning?.nurse_id || !cosigning.patient_id || !cosigning.shift_id) return;
        setBusy(true); setError(null);
        try {
            await api('/api/supervisor/co-sign', 'POST', { nurse_id: cosigning.nurse_id, patient_id: cosigning.patient_id, shift_id: cosigning.shift_id, reason });
            setCosigning(null); setReason(''); router.refresh();
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        finally { setBusy(false); }
    }

    return (
        <Card title={`Safety alerts (${filtered.length})`} action={
            <div className="flex gap-2">
                <select className="input !w-32" value={severity} onChange={e => setSeverity(e.target.value)}>
                    <option value="">All severities</option><option>CRITICAL</option><option>WARNING</option><option>INFO</option>
                </select>
                <select className="input !w-32" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All statuses</option><option value="open">open</option><option value="resolved">resolved</option><option value="dismissed">dismissed</option>
                </select>
            </div>
        }>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[820px]">
                    <thead><tr><th className="th">Severity</th><th className="th">Rule</th><th className="th">Description</th><th className="th">Nurse</th><th className="th">Bed</th><th className="th">Created</th><th className="th">Status</th><th className="th"></th></tr></thead>
                    <tbody>
                        {filtered.map(a => (
                            <tr key={a.id} className="hover:bg-slate-50">
                                <td className="td"><Badge tone={a.severity}>{a.severity}</Badge></td>
                                <td className="td text-xs font-mono">{a.rule_code}</td>
                                <td className="td text-xs text-slate-600 max-w-md">{a.description}</td>
                                <td className="td text-xs">{nurseName(a.nurse_id)}</td>
                                <td className="td text-xs">{bed(a.patient_id)}</td>
                                <td className="td text-xs">{new Date(a.created_at).toLocaleString()}</td>
                                <td className="td"><Badge tone={a.resolution_status === 'open' ? 'amber' : 'green'}>{a.resolution_status}</Badge></td>
                                <td className="td whitespace-nowrap">
                                    {staff && a.resolution_status === 'open' && (
                                        <>
                                            {(a.rule_code === 'JUNIOR_S4' || a.rule_code === 'JUNIOR_M4') && a.nurse_id && a.patient_id && (
                                                <button className="btn-blue !py-1 !px-2 text-xs" onClick={() => { setError(null); setReason(''); setCosigning(a); }}>Co-sign</button>
                                            )}{' '}
                                            <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => { setError(null); setReason(''); setResolving(a); }}>Resolve</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <Empty>No alerts match the filters.</Empty>}
            </div>

            <Modal open={resolving !== null} onClose={() => setResolving(null)} title="Resolve alert">
                <p className="text-sm text-slate-600 mb-2">{resolving?.description}</p>
                <label className="label">Resolution note</label>
                <textarea className="input" rows={2} value={reason} onChange={e => setReason(e.target.value)} />
                <ErrorNote error={error} />
                <div className="mt-3 flex justify-end gap-2">
                    <button className="btn-ghost" onClick={() => setResolving(null)}>Cancel</button>
                    <button className="btn-primary" onClick={resolve} disabled={busy || reason.trim().length < 4}>Mark resolved</button>
                </div>
            </Modal>

            <Modal open={cosigning !== null} onClose={() => setCosigning(null)} title="Senior authorization (co-sign)">
                <p className="text-sm text-slate-600 mb-2">
                    Authorize <b>{nurseName(cosigning?.nurse_id ?? null)}</b> (junior) for bed <b>{bed(cosigning?.patient_id ?? null)}</b>.
                    This is authenticated and audited. It does <b>not</b> bypass competency, licensing, capacity, or isolation restrictions.
                </p>
                <label className="label">Clinical justification</label>
                <textarea className="input" rows={2} value={reason} onChange={e => setReason(e.target.value)} />
                <ErrorNote error={error} />
                <div className="mt-3 flex justify-end gap-2">
                    <button className="btn-ghost" onClick={() => setCosigning(null)}>Cancel</button>
                    <button className="btn-blue" onClick={cosign} disabled={busy || reason.trim().length < 4}>Co-sign</button>
                </div>
            </Modal>
        </Card>
    );
}