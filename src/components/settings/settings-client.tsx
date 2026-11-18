// src/components/settings/settings-client.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Profile, ResolvedConfig } from '../../types/index.ts';
import { api, Badge, Card, Empty, ErrorNote } from '../ui.tsx';

type Tab = 'model' | 'descriptors' | 'users' | 'audit';

export function SettingsClient({ cfg, configVersion, profiles }: { cfg: ResolvedConfig; configVersion: string; profiles: Profile[] }) {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>('model');
    const [model, setModel] = useState({ workload: { ...cfg.workload }, capacity: { ...cfg.capacity }, maxPatients: { ...cfg.maxPatients }, fatigue: { ...cfg.fatigue }, utilization: { ...cfg.utilization }, safety: { ...cfg.safety } });
    const [descriptors, setDescriptors] = useState(JSON.parse(JSON.stringify(cfg.descriptors)) as ResolvedConfig['descriptors']);
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
    const [invite, setInvite] = useState({ email: '', full_name: '', role: 'nurse', temp_password: '' });
    const [audit, setAudit] = useState<{ items: Record<string, unknown>[]; total: number } | null>(null);
    const [auditPage, setAuditPage] = useState(1);

    useEffect(() => {
        if (tab === 'audit') api<{ items: Record<string, unknown>[]; total: number }>(`/api/admin/audit?page=${auditPage}&page_size=20`).then(setAudit).catch(e => setError(e.message));
    }, [tab, auditPage]);

    async function saveModel(patch: Record<string, unknown>) {
        setBusy(true); setError(null); setSaved(false);
        try { await api('/api/settings/ward', 'PATCH', patch); setSaved(true); router.refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        finally { setBusy(false); }
    }
    async function setRole(id: string, role: string) {
        setBusy(true); setError(null);
        try { await api('/api/admin/users', 'PATCH', { id, role }); router.refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        finally { setBusy(false); }
    }
    async function inviteUser() {
        setBusy(true); setError(null);
        try { await api('/api/admin/users', 'POST', invite); setInvite({ email: '', full_name: '', role: 'nurse', temp_password: '' }); router.refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
        finally { setBusy(false); }
    }
    const num = (v: string) => Number(v);

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex flex-wrap items-center gap-2">
                    {(['model', 'descriptors', 'users', 'audit'] as Tab[]).map(t => (
                        <button key={t} className={tab === t ? 'btn-primary' : 'btn-ghost'} onClick={() => { setTab(t); setError(null); setSaved(false); }}>{t}</button>
                    ))}
                    <span className="ml-auto text-xs text-slate-500">config version <Badge tone="teal">{configVersion}</Badge> — every allocation run records it</span>
                </div>
            </Card>

            {tab === 'model' && (
                <Card title="Workload, capacity, fatigue, thresholds, safety policies">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {(['admissionWeight', 'dischargeWeight', 'preOpWeight', 'transferWeight'] as const).map(k => (
                            <div key={k}><label className="label">{k}</label><input type="number" className="input" value={model.workload[k]} onChange={e => setModel(m => ({ ...m, workload: { ...m.workload, [k]: num(e.target.value) } }))} /></div>
                        ))}
                        {(['junior', 'staff', 'senior'] as const).map(t => (
                            <div key={t}><label className="label">{t} base capacity</label><input type="number" className="input" value={model.capacity[t]} onChange={e => setModel(m => ({ ...m, capacity: { ...m.capacity, [t]: num(e.target.value) } }))} /></div>
                        ))}
                        {(['junior', 'staff', 'senior'] as const).map(t => (
                            <div key={t}><label className="label">{t} max patients</label><input type="number" className="input" value={model.maxPatients[t]} onChange={e => setModel(m => ({ ...m, maxPatients: { ...m.maxPatients, [t]: num(e.target.value) } }))} /></div>
                        ))}
                        <div><label className="label">Fatigue threshold (shifts)</label><input type="number" className="input" value={model.fatigue.consecutiveShiftThreshold} onChange={e => setModel(m => ({ ...m, fatigue: { ...m.fatigue, consecutiveShiftThreshold: num(e.target.value) } }))} /></div>
                        <div><label className="label">Fatigue multiplier</label><input type="number" step="0.01" className="input" value={model.fatigue.fatigueMultiplier} onChange={e => setModel(m => ({ ...m, fatigue: { ...m.fatigue, fatigueMultiplier: num(e.target.value) } }))} /></div>
                        <div><label className="label">Green threshold (&lt;)</label><input type="number" step="0.01" className="input" value={model.utilization.greenThreshold} onChange={e => setModel(m => ({ ...m, utilization: { ...m.utilization, greenThreshold: num(e.target.value) } }))} /></div>
                        <div><label className="label">Amber threshold (≤)</label><input type="number" step="0.01" className="input" value={model.utilization.amberThreshold} onChange={e => setModel(m => ({ ...m, utilization: { ...m.utilization, amberThreshold: num(e.target.value) } }))} /></div>
                        <div><label className="label">Isolation competency code</label><input className="input" value={model.safety.isolationCompetencyCode} onChange={e => setModel(m => ({ ...m, safety: { ...m.safety, isolationCompetencyCode: e.target.value } }))} /></div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={model.safety.requireIsolationCompetency} onChange={e => setModel(m => ({ ...m, safety: { ...m.safety, requireIsolationCompetency: e.target.checked } }))} /> Isolation requires verified competency</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={model.safety.juniorHighAcuityRequiresAuth} onChange={e => setModel(m => ({ ...m, safety: { ...m.safety, juniorHighAcuityRequiresAuth: e.target.checked } }))} /> Junior S4/M4 requires senior authorization</label>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Saving bumps the config version and re-scores all patients transactionally (DB trigger). Demonstration values — institution must approve its own policies.</p>
                    <ErrorNote error={error} />{saved && <p className="text-sm text-teal-700 mt-2">Saved.</p>}
                    <button className="btn-primary mt-3" disabled={busy} onClick={() => saveModel(model)}>{busy ? 'Saving…' : 'Save configuration'}</button>
                </Card>
            )}

            {tab === 'descriptors' && (
                <Card title="Institutional level descriptors (1–4)">
                    <p className="text-xs text-slate-500 mb-3">Editable institutional definitions. These are NOT official TISS standards; the hospital is responsible for approving them.</p>
                    {(['s', 'm', 'v', 'd'] as const).map(dim => (
                        <div key={dim} className="mb-4">
                            <h3 className="label">{dim.toUpperCase()}</h3>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {[1, 2, 3, 4].map(n => (
                                    <div key={n} className="flex items-center gap-2">
                                        <span className="text-sm font-semibold w-4">{n}</span>
                                        <input className="input" value={descriptors[dim][String(n)] ?? ''} onChange={e => setDescriptors(d => ({ ...d, [dim]: { ...d[dim], [String(n)]: e.target.value } }))} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <ErrorNote error={error} />{saved && <p className="text-sm text-teal-700 mt-2">Saved.</p>}
                    <button className="btn-primary" disabled={busy} onClick={() => saveModel({ descriptors })}>{busy ? 'Saving…' : 'Save descriptors'}</button>
                </Card>
            )}

            {tab === 'users' && (
                <Card title="Users & roles">
                    <table className="w-full">
                        <thead><tr><th className="th">Name</th><th className="th">User ID</th><th className="th">Role</th></tr></thead>
                        <tbody>
                            {profiles.map(p => (
                                <tr key={p.id}>
                                    <td className="td font-medium">{p.full_name}</td>
                                    <td className="td text-xs font-mono text-slate-500">{p.id.slice(0, 8)}…</td>
                                    <td className="td">
                                        <select className="input !w-36" value={p.role} disabled={busy} onChange={e => setRole(p.id, e.target.value)}>
                                            <option value="nurse">nurse</option><option value="supervisor">supervisor</option><option value="admin">admin</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <h3 className="label mt-5">Create user (admin-set temporary password)</h3>
                    <div className="grid sm:grid-cols-5 gap-2 items-end">
                        <div><label className="label">Email</label><input className="input" type="email" value={invite.email} onChange={e => setInvite(i => ({ ...i, email: e.target.value }))} /></div>
                        <div><label className="label">Full name</label><input className="input" value={invite.full_name} onChange={e => setInvite(i => ({ ...i, full_name: e.target.value }))} /></div>
                        <div><label className="label">Role</label>
                            <select className="input" value={invite.role} onChange={e => setInvite(i => ({ ...i, role: e.target.value }))}>
                                <option value="nurse">nurse</option><option value="supervisor">supervisor</option><option value="admin">admin</option>
                            </select></div>
                        <div><label className="label">Temp password</label><input className="input" type="password" value={invite.temp_password} onChange={e => setInvite(i => ({ ...i, temp_password: e.target.value }))} /></div>
                        <button className="btn-primary" disabled={busy} onClick={inviteUser}>Create</button>
                    </div>
                    <ErrorNote error={error} />
                </Card>
            )}

            {tab === 'audit' && (
                <Card title={`Audit history${audit ? ` (${audit.total})` : ''}`}>
                    {!audit ? <Empty>Loading…</Empty> : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px]">
                                    <thead><tr><th className="th">When</th><th className="th">Action</th><th className="th">Entity</th><th className="th">User</th><th className="th">Reason</th></tr></thead>
                                    <tbody>
                                        {audit.items.map((a, i) => (
                                            <tr key={i}>
                                                <td className="td text-xs">{new Date(String(a.created_at)).toLocaleString()}</td>
                                                <td className="td"><Badge tone="blue">{String(a.action_type)}</Badge></td>
                                                <td className="td text-xs">{String(a.entity_type)} {String(a.entity_id ?? '').slice(0, 8)}</td>
                                                <td className="td text-xs font-mono">{String(a.user_id ?? 'system').slice(0, 8)}</td>
                                                <td className="td text-xs text-slate-500">{String(a.reason ?? '—')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                                <button className="btn-ghost" disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>Prev</button>
                                <span className="text-sm text-slate-500 py-2">Page {auditPage}</span>
                                <button className="btn-ghost" disabled={auditPage * 20 >= audit.total} onClick={() => setAuditPage(p => p + 1)}>Next</button>
                            </div>
                        </>
                    )}
                    <ErrorNote error={error} />
                </Card>
            )}
        </div>
    );
}