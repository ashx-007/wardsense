// src/components/shifts/shifts-client.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Shift } from '../../types/index.ts';
import { api, Badge, Card, Empty, ErrorNote, Modal } from '../ui.tsx';

export function ShiftsClient({ shifts }: { shifts: Shift[] }) {
    const router = useRouter();
    const [creating, setCreating] = useState(false);
    const [closing, setClosing] = useState<Shift | null>(null);
    const [form, setForm] = useState({ shift_name: 'Day 07:00–15:00', start_time: '', end_time: '', status: 'scheduled' });
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);

    async function create() {
        setBusy(true); setError(null);
        try {
            await api('/api/shifts', 'POST', { ...form, start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString() });
            setCreating(false); router.refresh();
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        finally { setBusy(false); }
    }
    async function close() {
        if (!closing) return;
        setBusy(true); setError(null);
        try {
            const s = await api<{ max_u: number; unassigned: number }>('/api/shifts/' + closing.id + '/close', 'POST');
            setSummary(`Shift closed. Max utilization ${(s.max_u * 100).toFixed(1)}%, ${s.unassigned} unassigned at close. Consecutive-shift counters updated.`);
            setClosing(null); router.refresh();
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        finally { setBusy(false); }
    }

    return (
        <Card title="Shifts" action={<button className="btn-primary" onClick={() => { setError(null); setCreating(true); }}>+ Shift</button>}>
            {summary && <p className="mb-3 text-sm text-teal-700">{summary}</p>}
            <table className="w-full">
                <thead><tr><th className="th">Shift</th><th className="th">Start</th><th className="th">End</th><th className="th">Status</th><th className="th"></th></tr></thead>
                <tbody>
                    {shifts.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                            <td className="td font-medium">{s.shift_name}</td>
                            <td className="td text-xs">{new Date(s.start_time).toLocaleString()}</td>
                            <td className="td text-xs">{new Date(s.end_time).toLocaleString()}</td>
                            <td className="td"><Badge tone={s.status === 'active' ? 'green' : s.status === 'scheduled' ? 'blue' : 'slate'}>{s.status}</Badge></td>
                            <td className="td">{s.status === 'active' && <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => { setError(null); setClosing(s); }}>Close shift</button>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {shifts.length === 0 && <Empty>No shifts.</Empty>}

            <Modal open={creating} onClose={() => setCreating(false)} title="New shift">
                <div className="space-y-3">
                    <div><label className="label">Name</label><input className="input" value={form.shift_name} onChange={e => setForm(f => ({ ...f, shift_name: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="label">Start</label><input type="datetime-local" className="input" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
                        <div><label className="label">End</label><input type="datetime-local" className="input" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
                    </div>
                    <div><label className="label">Status</label>
                        <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                            <option value="scheduled">scheduled</option><option value="active">active (one per ward)</option>
                        </select></div>
                    <ErrorNote error={error} />
                    <button className="btn-primary w-full" onClick={create} disabled={busy || !form.start_time || !form.end_time}>{busy ? 'Creating…' : 'Create shift'}</button>
                </div>
            </Modal>

            <Modal open={closing !== null} onClose={() => setClosing(null)} title="Close shift">
                <p className="text-sm text-slate-600">Closing <b>{closing?.shift_name}</b> writes a historical snapshot, ends approved assignments, and increments consecutive-shift counters for nurses who worked it (fatigue rule applies at ≥ threshold).</p>
                <ErrorNote error={error} />
                <div className="mt-4 flex justify-end gap-2">
                    <button className="btn-ghost" onClick={() => setClosing(null)}>Cancel</button>
                    <button className="btn-danger" onClick={close} disabled={busy}>{busy ? 'Closing…' : 'Close shift'}</button>
                </div>
            </Modal>
        </Card>
    );
}