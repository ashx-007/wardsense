// src/components/nurses/nurses-client.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Nurse, NurseUtilization, ResolvedConfig } from '../../types/index.ts';
import { api, Badge, Card, Modal, UtilBar, ErrorNote, Empty } from '../ui.tsx';

const AVAIL = ['available', 'unavailable', 'on_leave', 'off_shift', 'restricted'] as const;

export function NursesClient({ nurses, utils, cfg }: { nurses: Nurse[]; utils: NurseUtilization[]; cfg: ResolvedConfig }) {
    const router = useRouter();
    const utilById = new Map(utils.map(u => [u.nurse_id, u]));
    const [editing, setEditing] = useState<Nurse | 'new' | null>(null);
    const [comps, setComps] = useState<Nurse | null>(null);
    const [form, setForm] = useState<Record<string, unknown>>({});
    const [newComp, setNewComp] = useState({ competency_code: 'MED', proficiency_level: 'basic', verification_status: 'pending', expires_at: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function openEdit(n: Nurse | 'new') {
        setError(null);
        setEditing(n);
        setForm(
            n === 'new'
                ? { name: '', tier: 'staff', availability_status: 'available', consecutive_shifts: 0, is_active: true, profile_id: '' }
                : {
                      name: n.name,
                      tier: n.tier,
                      availability_status: n.availability_status,
                      consecutive_shifts: n.consecutive_shifts,
                      is_active: n.is_active,
                      base_cap: n.base_cap,
                      max_patients: n.max_patients,
                      profile_id: n.profile_id ?? '',
                  },
        );
    }

    async function save() {
        setBusy(true);
        setError(null);
        try {
            const rawProfileId = form.profile_id ? String(form.profile_id).trim() : null;
            const payload = {
                ...form,
                profile_id: rawProfileId || null,
                consecutive_shifts: Number(form.consecutive_shifts),
                base_cap: form.base_cap !== undefined ? Number(form.base_cap) : undefined,
                max_patients: form.max_patients !== undefined ? Number(form.max_patients) : undefined,
            };
            if (editing === 'new') await api('/api/nurses', 'POST', payload);
            else await api(`/api/nurses/${(editing as Nurse).id}`, 'PATCH', payload);
            setEditing(null);
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Save failed');
        } finally {
            setBusy(false);
        }
    }

    async function addComp() {
        if (!comps) return;
        setBusy(true);
        setError(null);
        try {
            await api(`/api/nurses/${comps.id}/competencies`, 'POST', {
                ...newComp,
                expires_at: newComp.expires_at ? new Date(newComp.expires_at).toISOString() : null,
            });
            const updated = await api<Nurse>(`/api/nurses/${comps.id}`);
            setComps(updated);
            setNewComp({ competency_code: 'MED', proficiency_level: 'basic', verification_status: 'pending', expires_at: '' });
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        } finally {
            setBusy(false);
        }
    }

    async function patchComp(id: string, patch: Record<string, unknown>) {
        if (!comps) return;
        setBusy(true);
        setError(null);
        try {
            await api(`/api/nurses/${comps.id}/competencies`, 'PATCH', { id, ...patch });
            setComps(await api<Nurse>(`/api/nurses/${comps.id}`));
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed');
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card title={`Nurses (${nurses.length})`} action={<button className="btn-primary" onClick={() => openEdit('new')}>+ Nurse</button>}>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                    <thead>
                        <tr>
                            <th className="th">Name</th>
                            <th className="th">Tier</th>
                            <th className="th">Patients</th>
                            <th className="th">Workload</th>
                            <th className="th">Adj. capacity</th>
                            <th className="th">Utilization</th>
                            <th className="th">Availability</th>
                            <th className="th">Shifts</th>
                            <th className="th"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {nurses.map(n => {
                            const u = utilById.get(n.id);
                            return (
                                <tr key={n.id} className="hover:bg-slate-50">
                                    <td className="td font-medium">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span>{n.name}</span>
                                            {!n.is_active && <Badge tone="slate">inactive</Badge>}
                                            {n.profile_id && (
                                                <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded font-mono" title={`Linked to auth user: ${n.profile_id}`}>
                                                    linked
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="td">
                                        <Badge tone={n.tier === 'senior' ? 'teal' : n.tier === 'staff' ? 'blue' : 'slate'}>
                                            {n.tier}
                                        </Badge>
                                    </td>
                                    <td className="td">{u?.patient_count ?? 0} / {n.max_patients}</td>
                                    <td className="td tabular-nums">{u?.assigned_w ?? 0}</td>
                                    <td className="td tabular-nums">
                                        {u ? u.adjusted_capacity.toFixed(1) : n.base_cap}
                                        {u && u.fatigue_multiplier < 1 && (
                                            <span className="text-xs text-amber-600 ml-1">×{u.fatigue_multiplier}</span>
                                        )}
                                    </td>
                                    <td className="td">{u && <UtilBar u={u.utilization} status={u.status} />}</td>
                                    <td className="td">
                                        <Badge tone={n.availability_status === 'available' ? 'green' : 'amber'}>
                                            {n.availability_status}
                                        </Badge>
                                    </td>
                                    <td className="td">{n.consecutive_shifts}</td>
                                    <td className="td whitespace-nowrap">
                                        <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => openEdit(n)}>
                                            Edit
                                        </button>{' '}
                                        <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => { setError(null); setComps(n); }}>
                                            Competencies ({n.competencies.length})
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {nurses.length === 0 && <Empty>No nurses yet.</Empty>}
            </div>

            <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New nurse' : 'Edit nurse'}>
                <div className="space-y-3">
                    <div>
                        <label className="label">Name</label>
                        <input className="input" value={String(form.name ?? '')} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>

                    <div>
                        <label className="label">Linked User Account (Profile UUID)</label>
                        <div className="flex gap-2">
                            <input
                                className="input font-mono text-xs"
                                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                                value={String(form.profile_id ?? '')}
                                onChange={e => setForm(f => ({ ...f, profile_id: e.target.value }))}
                            />
                            <button
                                type="button"
                                className="btn btn-ghost text-xs whitespace-nowrap"
                                onClick={async () => {
                                    try {
                                        const res = await api<{ user?: { id: string } }>('/api/auth/me');
                                        if (res.user?.id) setForm(f => ({ ...f, profile_id: res.user!.id }));
                                    } catch {
                                        // Ignore
                                    }
                                }}
                                title="Set this to your currently logged-in account UUID"
                            >
                                Link to Me
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Linking enables this user account to view personal assignments in Nurse mode.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Tier</label>
                            <select className="input" value={String(form.tier)} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
                                {['junior', 'staff', 'senior'].map(t => (
                                    <option key={t} value={t}>{t} (base {cfg.capacity[t as keyof typeof cfg.capacity]})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Availability</label>
                            <select className="input" value={String(form.availability_status)} onChange={e => setForm(f => ({ ...f, availability_status: e.target.value }))}>
                                {AVAIL.map(a => <option key={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Consecutive shifts</label>
                            <input type="number" min={0} className="input" value={Number(form.consecutive_shifts ?? 0)} onChange={e => setForm(f => ({ ...f, consecutive_shifts: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Base capacity</label>
                            <input type="number" step="0.1" className="input" value={form.base_cap !== undefined ? Number(form.base_cap) : cfg.capacity[form.tier as keyof typeof cfg.capacity]} onChange={e => setForm(f => ({ ...f, base_cap: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Max patients</label>
                            <input type="number" min={1} className="input" value={form.max_patients !== undefined ? Number(form.max_patients) : cfg.maxPatients[form.tier as keyof typeof cfg.maxPatients]} onChange={e => setForm(f => ({ ...f, max_patients: e.target.value }))} />
                        </div>
                        <label className="flex items-end gap-2 text-sm pb-2">
                            <input type="checkbox" checked={Boolean(form.is_active)} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Active
                        </label>
                    </div>
                    <ErrorNote error={error} />
                    <button className="btn-primary w-full" onClick={save} disabled={busy}>
                        {busy ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </Modal>

            <Modal open={comps !== null} onClose={() => { setComps(null); router.refresh(); }} title={`Competencies — ${comps?.name ?? ''}`} wide>
                <div className="space-y-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="th">Code</th>
                                <th className="th">Level</th>
                                <th className="th">Status</th>
                                <th className="th">Expires</th>
                                <th className="th">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(comps?.competencies ?? []).map(c => (
                                <tr key={c.id}>
                                    <td className="td font-mono font-medium">{c.competency_code}</td>
                                    <td className="td">{c.proficiency_level}</td>
                                    <td className="td">
                                        <Badge tone={c.verification_status === 'verified' ? 'green' : c.verification_status === 'pending' ? 'amber' : 'red'}>
                                            {c.verification_status}
                                        </Badge>
                                    </td>
                                    <td className="td text-xs text-slate-500">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                                    <td className="td">
                                        {c.verification_status !== 'verified' && (
                                            <button className="btn-ghost !py-0.5 !px-2 text-xs" onClick={() => patchComp(c.id!, { verification_status: 'verified' })}>
                                                Verify
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(comps?.competencies ?? []).length === 0 && <Empty>No competencies recorded.</Empty>}

                    <div className="border-t border-slate-200 pt-3">
                        <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Add Competency</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <select className="input" value={newComp.competency_code} onChange={e => setNewComp(c => ({ ...c, competency_code: e.target.value }))}>
                                {cfg.competencyCatalog.map(x => (
                                    <option key={x.code} value={x.code}>{x.code} — {x.name}</option>
                                ))}
                            </select>
                            <select className="input" value={newComp.proficiency_level} onChange={e => setNewComp(c => ({ ...c, proficiency_level: e.target.value as any }))}>
                                <option value="basic">basic</option>
                                <option value="intermediate">intermediate</option>
                                <option value="advanced">advanced</option>
                            </select>
                            <input type="date" className="input" value={newComp.expires_at} onChange={e => setNewComp(c => ({ ...c, expires_at: e.target.value }))} />
                            <button className="btn-primary" onClick={addComp} disabled={busy}>Add</button>
                        </div>
                    </div>
                    <ErrorNote error={error} />
                </div>
            </Modal>
        </Card>
    );
}
