// src/components/patients/patients-client.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Patient, ResolvedConfig } from '../../types/index.ts';
import { api, Badge, Card, Empty, Modal } from '../ui.tsx';
import { AcuityForm } from './acuity-form.tsx';

export function PatientsClient({ patients, cfg }: { patients: Patient[]; cfg: ResolvedConfig }) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState<Patient | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Patient | null>(null);
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

    const filtered = patients.filter(p => p.bed_no.toLowerCase().includes(query.toLowerCase()) || (p.clinical_context ?? '').toLowerCase().includes(query.toLowerCase()));

    async function save(payload: Record<string, unknown>) {
        setBusy(true); setError(null);
        try {
            if (editing === 'new') await api('/api/patients', 'POST', payload);
            else await api(`/api/patients/${(editing as Patient).id}`, 'PATCH', payload);
            setEditing(null); router.refresh();
        } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
        finally { setBusy(false); }
    }
    async function remove() {
        if (!deleting) return;
        setBusy(true); setError(null);
        try { await api(`/api/patients/${deleting.id}`, 'DELETE'); setDeleting(null); router.refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
        finally { setBusy(false); }
    }

    return (
        <Card title={`Patient roster (${patients.length})`} action={
            <div className="flex gap-2">
                <input className="input !w-44" placeholder="Search bed / context" value={query} onChange={e => setQuery(e.target.value)} />
                <button className="btn-primary" onClick={() => { setError(null); setEditing('new'); }}>+ Patient</button>
            </div>
        }>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                    <thead><tr><th className="th">Bed</th><th className="th">S</th><th className="th">M</th><th className="th">V</th><th className="th">D</th><th className="th">T</th><th className="th">W</th><th className="th">Flags</th><th className="th">Requirements</th><th className="th"></th></tr></thead>
                    <tbody>
                        {filtered.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                                <td className="td font-medium">{p.bed_no}</td>
                                <td className="td">{p.s}</td><td className="td">{p.m}</td><td className="td">{p.v}</td><td className="td">{p.d}</td>
                                <td className="td">{p.t}</td>
                                <td className="td"><Badge tone={p.workload_score > 16 ? 'red' : p.workload_score > 10 ? 'amber' : 'green'}>{p.workload_score}</Badge></td>
                                <td className="td space-x-1">
                                    {p.admission && <Badge tone="blue">ADM</Badge>}{p.discharge && <Badge tone="blue">DIS</Badge>}
                                    {p.pre_op && <Badge tone="teal">PRE</Badge>}{p.transfer && <Badge tone="teal">TRF</Badge>}
                                    {p.is_isolated && <Badge tone="amber">ISO</Badge>}
                                </td>
                                <td className="td text-xs text-slate-500">{p.requirements.map(r => `${r.competency_code}:${r.required_level}${r.is_mandatory ? '' : ' (opt)'}`).join(', ') || '—'}</td>
                                <td className="td whitespace-nowrap">
                                    <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => { setError(null); setEditing(p); }}>Edit</button>{' '}
                                    <button className="btn-ghost !py-1 !px-2 text-xs text-red-600" onClick={() => { setError(null); setDeleting(p); }}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && <Empty>No patients match.</Empty>}
            </div>
            <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New patient assessment' : `Edit bed ${(editing as Patient)?.bed_no ?? ''}`} wide>
                {editing !== null && <AcuityForm cfg={cfg} initial={editing === 'new' ? undefined : editing} onSubmit={save} busy={busy} error={error} />}
            </Modal>
            <Modal open={deleting !== null} onClose={() => setDeleting(null)} title="Delete patient">
                <p className="text-sm text-slate-600">Delete bed {deleting?.bed_no}? Patients with approved assignments cannot be deleted.</p>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                    <button className="btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
                    <button className="btn-danger" onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
                </div>
            </Modal>
        </Card>
    );
}