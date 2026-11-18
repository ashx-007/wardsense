// src/components/ui.tsx
'use client';
import { useEffect, type ReactNode } from 'react';
import type { WorkloadStatus } from '../types/index.ts';
import { pct } from '../lib/format.ts';

export { pct };

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

const tones: Record<string, string> = {
    green: 'bg-green-100 text-green-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800',
    slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-800', teal: 'bg-teal-100 text-teal-800',
    INFO: 'bg-blue-100 text-blue-800', WARNING: 'bg-amber-100 text-amber-800', CRITICAL: 'bg-red-100 text-red-800',
};
export function Badge({ tone = 'slate', children }: { tone?: string; children: ReactNode }) {
    return <span className={cx('badge', tones[tone] ?? tones.slate)}>{children}</span>;
}
export function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cx('card', className)}>
            {(title || action) && (
                <header className="flex items-center justify-between mb-3">
                    {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
                    {action}
                </header>
            )}
            {children}
        </section>
    );
}
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
    return (
        <div className="card !p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className={cx('mt-1 text-2xl font-semibold', tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900')}>{value}</div>
        </div>
    );
}
export function UtilBar({ u, status }: { u: number; status: WorkloadStatus }) {
    const width = Math.min(100, (Math.max(0, u) / 1.2) * 100);
    const color = status === 'green' ? 'bg-green-500' : status === 'amber' ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2 min-w-36">
            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={Math.round(u * 100)} aria-valuemin={0} aria-valuemax={120}>
                <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${width}%` }} />
            </div>
            <span className="text-xs tabular-nums text-slate-600 w-14 text-right">{pct(u)}</span>
        </div>
    );
}
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-label={title} className={cx('card w-full', wide ? 'max-w-3xl' : 'max-w-lg')}>
                <header className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">{title}</h3>
                    <button className="btn-ghost !px-2 !py-1" onClick={onClose} aria-label="Close">✕</button>
                </header>
                {children}
            </div>
        </div>
    );
}
export function ErrorNote({ error }: { error: string | null }) {
    return error ? <p className="mt-2 text-sm text-red-600" role="alert">{error}</p> : null;
}
export function Empty({ children }: { children: ReactNode }) {
    return <p className="text-sm text-slate-500 py-4 text-center">{children}</p>;
}
export async function api<T = unknown>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
    return json.data as T;
}
