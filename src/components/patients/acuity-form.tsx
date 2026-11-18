// src/components/patients/acuity-form.tsx
'use client';
import { useMemo, useState } from 'react';
import type { Patient, PatientRequirement, ResolvedConfig } from '../../types/index.ts';
import { computeWorkload } from '../../server/services/scoring.service.ts';
import { ErrorNote, Badge } from '../ui.tsx';

const DIMS = [['s', 'Stability (S)'], ['m', 'Medication / IV complexity (M)'], ['v', 'Vital-sign monitoring (V)'], ['d', 'Physical dependency (D)']] as const;
const FLAGS = [['admission', 'Admission'], ['discharge', 'Discharge'], ['pre_op', 'Pre-Op'], ['transfer', 'Transfer']] as const;

export function AcuityForm({ cfg, initial, onSubmit, busy, error }: {
    cfg: ResolvedConfig; initial?: Patient;
    onSubmit: (payload: Record<string, unknown>) => Promise<void>; busy: boolean; error: string | null;
}) {
    const [form, setForm] = useState({
        bed_no: initial?.bed_no ?? '', clinical_context: initial?.clinical_context ?? '',
        s: initial?.s ?? 1, m: initial?.m ?? 1, v: initial?.v ?? 1, d: initial?.d ?? 1,
        admission: initial?.admission ?? false, discharge: initial?.discharge ?? false,
        pre_op: initial?.pre_op ?? false, transfer: initial?.transfer ?? false, is_isolated: initial?.is_isolated ?? false,
    });
    const [reqs, setReqs] = useState<PatientRequirement[]>(initial?.requirements?.map(r => ({ competency_code: r.competency_code, required_level: r.required_level, is_mandatory: r.is_mandatory })) ?? []);
    const live = useMemo(() => computeWorkload(form, cfg), [form, cfg]);
    const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

    return (
        <form onSubmit={async e => { e.preventDefault(); await onSubmit({ ...form, clinical_context: form.clinical_context || null, requirements: reqs }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Bed</label><input className="input" value={form.bed_no} onChange={e => set('bed_no', e.target.value)} required /></div>
                <div className="flex items-end justify-end">
                    <div className="text-right">
                        <div className="text-xs text-slate-500">Live workload (server recomputes)</div>
                        <div className="text-3xl font-semibold text-teal-700" data-testid="live-workload">W = {live.workload_score}</div>
                    </div>
                </div>
            </div>
            <div><label className="label">Clinical context (synthetic data only)</label>
                <textarea className="input" rows={2} value={form.clinical_context ?? ''} onChange={e => set('clinical_context', e.target.value)} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
                {DIMS.map(([key, label]) => (
                    <div key={key}>
                        <label className="label">{label}</label>
                        <select className="input" value={form[key]} onChange={e => set(key, Number(e.target.value))}>
                            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} — {cfg.descriptors[key][String(n)]}</option>)}
                        </select>
                    </div>
                ))}
            </div>
            <fieldset className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <legend className="label">Transitions (T = {live.t})</legend>
                {FLAGS.map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} />
                        {label} <span className="text-xs text-slate-400">+{key === 'admission' || key === 'discharge' ? cfg.workload.admissionWeight : cfg.workload.preOpWeight}</span>
                    </label>
                ))}
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_isolated} onChange={e => set('is_isolated', e.target.checked)} />
                Isolation precautions <Badge tone="amber">not part of W — safety policy applies</Badge>
            </label>
            <div>
                <div className="flex items-center justify-between">
                    <span className="label !mb-0">Required competencies</span>
                    <button type="button" className="btn-ghost !py-1 !px-2 text-xs" onClick={() => setReqs(r => [...r, { competency_code: cfg.competencyCatalog[0]?.code ?? 'MED', required_level: 'basic', is_mandatory: true }])}>+ Add</button>
                </div>
                {reqs.map((r, i) => (
                    <div key={i} className="flex gap-2 mt-2 items-center">
                        <select className="input" value={r.competency_code} onChange={e => setReqs(rs => rs.map((x, j) => j === i ? { ...x, competency_code: e.target.value } : x))}>
                            {cfg.competencyCatalog.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                        </select>
                        <select className="input" value={r.required_level} onChange={e => setReqs(rs => rs.map((x, j) => j === i ? { ...x, required_level: e.target.value as PatientRequirement['required_level'] } : x))}>
                            {['basic', 'intermediate', 'advanced'].map(l => <option key={l}>{l}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                            <input type="checkbox" checked={r.is_mandatory} onChange={e => setReqs(rs => rs.map((x, j) => j === i ? { ...x, is_mandatory: e.target.checked } : x))} /> mandatory
                        </label>
                        <button type="button" className="btn-ghost !px-2 !py-1" onClick={() => setReqs(rs => rs.filter((_, j) => j !== i))}>✕</button>
                    </div>
                ))}
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-medium text-slate-700">How this score is calculated</p>
                <p>{live.explanation}</p>
                <p>{live.parts.map(p => `${p.label}: ${p.points}`).join(' · ')}</p>
            </div>
            <ErrorNote error={error} />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Create patient'}</button>
        </form>
    );
}