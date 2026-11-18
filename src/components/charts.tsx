// src/components/charts.tsx
'use client';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NurseUtilization } from '../types/index.ts';

const COLORS = { green: '#16a34a', amber: '#d97706', red: '#dc2626' };

export function UtilizationChart({ data, green, amber }: { data: NurseUtilization[]; green: number; amber: number }) {
    const rows = data.map(u => ({ name: u.name, utilization: +(u.utilization * 100).toFixed(2), status: u.status }));
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, 'Utilization']} />
                <ReferenceLine y={green * 100} stroke="#16a34a" strokeDasharray="4 4" />
                <ReferenceLine y={amber * 100} stroke="#dc2626" strokeDasharray="4 4" />
                <Bar dataKey="utilization" radius={[4, 4, 0, 0]}>
                    {rows.map((r, i) => <Cell key={i} fill={COLORS[r.status]} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

export function Histogram({ bins }: { bins: { label: string; count: number }[] }) {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bins} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function TrendChart({ data, series }: { data: Record<string, string | number>[]; series: { key: string; color: string; name: string }[] }) {
    return (
        <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                {series.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} />)}
            </LineChart>
        </ResponsiveContainer>
    );
}

export function CapacityChart({ data }: { data: NurseUtilization[] }) {
    const rows = data.map(u => ({ name: u.name, capacity: +u.adjusted_capacity.toFixed(1), tier: u.tier }));
    const tierColor: Record<string, string> = { junior: '#60a5fa', staff: '#2563eb', senior: '#0f2540' };
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="capacity" radius={[4, 4, 0, 0]}>
                    {rows.map((r, i) => <Cell key={i} fill={tierColor[r.tier]} />)}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}