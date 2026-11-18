// src/app/(app)/dashboard/page.tsx
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../server/repositories/shift.repository.ts';
import { listNurses } from '../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../server/repositories/patient.repository.ts';
import { currentAssignments } from '../../../server/repositories/assignment.repository.ts';
import { nurseUtilization, wardStats, wardUtilizations } from '../../../server/services/utilization.service.ts';
import { Badge, Card, Empty, Stat, UtilBar } from '../../../components/ui.tsx';
import { pct } from '../../../lib/format.ts';
import { UtilizationChart } from '../../../components/charts.tsx';
import { RebalanceButton } from '../../../components/dashboard/overview-client.tsx';
import { NurseHome } from '../../../components/dashboard/nurse-home.tsx';
import { DashboardModeSwitcher } from '../../../components/layout/mode-switcher.tsx';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const sb = await serverClient();
    const session = await getSession(sb);
    const { ward, cfg } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    const nurses = await listNurses(sb, ward.id);
    const { items: patients } = await listPatients(sb, ward.id);
    const assignments = shift ? await currentAssignments(sb, shift.id) : [];
    const utils = wardUtilizations(nurses, patients, assignments, shift?.id ?? null, cfg);

    // ========================================================================
    // NURSE PRESENTATION MODE (or role === 'nurse')
    // ========================================================================
    if (session.activeMode === 'nurse') {
        const me = session.linkedNurse ?? (nurses.find(n => n.profile_id === session.user!.id) ?? null);
        const mine = me ? assignments.filter(a => a.nurse_id === me.id) : [];
        const myAssignedW = mine.reduce((sum, a) => sum + (a.workload_score ?? 0), 0);
        const myUtil = me ? nurseUtilization(me, myAssignedW, mine.length, cfg) : null;

        let query = sb.from('safety_alerts').select('*').eq('resolution_status', 'open');
        if (me) {
            query = query.eq('nurse_id', me.id);
        }
        const { data: alerts } = await query.order('created_at', { ascending: false }).limit(10);

        return (
            <div className="space-y-4">
                {session.availableModes.length > 1 && (
                    <DashboardModeSwitcher
                        activeMode={session.activeMode}
                        availableModes={session.availableModes}
                        linkedNurse={session.linkedNurse}
                        userName={session.profile?.full_name || session.user?.email}
                    />
                )}
                <NurseHome
                    nurse={me}
                    util={myUtil}
                    assignments={mine}
                    shift={shift}
                    alerts={alerts ?? []}
                    isSupervisor={session.role === 'supervisor' || session.role === 'admin'}
                />
            </div>
        );
    }

    // ========================================================================
    // SUPERVISOR PRESENTATION MODE (default for supervisors & admins)
    // ========================================================================
    const stats = wardStats(patients, assignments, shift?.id ?? null, utils, cfg);
    const { data: alerts } = await sb
        .from('safety_alerts')
        .select('*')
        .eq('resolution_status', 'open')
        .order('created_at', { ascending: false })
        .limit(8);
    const critical = (alerts ?? []).filter(a => a.severity === 'CRITICAL');

    return (
        <div className="space-y-4">
            {session.availableModes.length > 1 && (
                <DashboardModeSwitcher
                    activeMode={session.activeMode}
                    availableModes={session.availableModes}
                    linkedNurse={session.linkedNurse}
                    userName={session.profile?.full_name || session.user?.email}
                />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <Stat label="Total patients" value={stats.total_patients} />
                <Stat label="Active nurses" value={stats.active_nurses} />
                <Stat
                    label="Unassigned"
                    value={stats.unassigned_patients}
                    tone={stats.unassigned_patients > 0 ? 'amber' : undefined}
                />
                <Stat
                    label="Critical alerts"
                    value={critical.length}
                    tone={critical.length > 0 ? 'red' : undefined}
                />
                <Stat
                    label="Current shift"
                    value={<span className="text-base">{shift ? shift.shift_name : 'none active'}</span>}
                />
            </div>

            {critical.length > 0 && (
                <Card
                    className="!border-red-200 !bg-red-50/50"
                    title="Critical safety warnings"
                    action={
                        <Link href="/alerts" className="text-sm text-blue-600 hover:underline">
                            Review all &rarr;
                        </Link>
                    }
                >
                    {critical.map(a => (
                        <p key={a.id} className="text-sm text-red-700 py-1">
                            <Badge tone="CRITICAL">{a.rule_code}</Badge>
                            <span className="ml-2">{a.description}</span>
                        </p>
                    ))}
                </Card>
            )}

            <div className="grid lg:grid-cols-3 gap-4">
                <Card
                    className="lg:col-span-2"
                    title="Nurse workload overview"
                    action={<RebalanceButton disabled={!shift} />}
                >
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px]">
                            <thead>
                                <tr>
                                    <th className="th">Nurse</th>
                                    <th className="th">Tier</th>
                                    <th className="th">Patients</th>
                                    <th className="th">W</th>
                                    <th className="th">Adj. cap</th>
                                    <th className="th">Utilization</th>
                                    <th className="th">Availability</th>
                                </tr>
                            </thead>
                            <tbody>
                                {utils.map(u => {
                                    const isCurrentAccount = session.linkedNurse?.id === u.nurse_id;
                                    return (
                                        <tr key={u.nurse_id} className={isCurrentAccount ? 'bg-teal-50/50' : 'hover:bg-slate-50'}>
                                            <td className="td font-medium">
                                                <div className="flex items-center gap-1.5">
                                                    <span>{u.name}</span>
                                                    {isCurrentAccount && (
                                                        <span className="text-[10px] text-teal-700 font-semibold bg-teal-100 px-1.5 py-0.5 rounded">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="td">
                                                <Badge tone={u.tier === 'senior' ? 'teal' : u.tier === 'staff' ? 'blue' : 'slate'}>
                                                    {u.tier}
                                                </Badge>
                                            </td>
                                            <td className="td">{u.patient_count}</td>
                                            <td className="td tabular-nums">{u.assigned_w}</td>
                                            <td className="td tabular-nums">
                                                {u.adjusted_capacity.toFixed(1)}
                                                {u.fatigue_multiplier < 1 && (
                                                    <span className="text-xs text-amber-600 ml-1">fatigued</span>
                                                )}
                                            </td>
                                            <td className="td">
                                                <UtilBar u={u.utilization} status={u.status} />
                                            </td>
                                            <td className="td">
                                                <Badge tone={u.availability_status === 'available' && u.is_active ? 'green' : 'amber'}>
                                                    {u.is_active ? u.availability_status : 'inactive'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title="Patient acuity overview">
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Patients</dt>
                            <dd className="font-semibold">{stats.total_patients}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Average workload</dt>
                            <dd className="font-semibold">{stats.avg_patient_workload.toFixed(1)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Highest workload</dt>
                            <dd className="font-semibold">
                                {stats.highest_patient ? `Bed ${stats.highest_patient.bed_no} (W=${stats.highest_patient.workload})` : '—'}
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Isolation</dt>
                            <dd className="font-semibold">{stats.isolation_count}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Requiring transitions</dt>
                            <dd className="font-semibold">{stats.transition_count}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-slate-500">Ward avg / max U</dt>
                            <dd className="font-semibold">
                                {pct(stats.avg_utilization)} / {pct(stats.max_utilization)}
                            </dd>
                        </div>
                    </dl>
                    {cfg.demoData && (
                        <p className="mt-3">
                            <Badge tone="amber">demo dataset</Badge>
                        </p>
                    )}
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <Card title="Workload distribution">
                    <UtilizationChart
                        data={utils}
                        green={cfg.utilization.greenThreshold}
                        amber={cfg.utilization.amberThreshold}
                    />
                </Card>
                <Card
                    title="Open safety alerts"
                    action={
                        <Link href="/alerts" className="text-sm text-blue-600 hover:underline">
                            All alerts &rarr;
                        </Link>
                    }
                >
                    {(alerts ?? []).length === 0 ? (
                        <Empty>No open alerts.</Empty>
                    ) : (
                        (alerts ?? []).map(a => (
                            <div key={a.id} className="py-1.5 border-b border-slate-100 last:border-0 text-sm flex gap-2">
                                <Badge tone={a.severity}>{a.severity}</Badge>
                                <span className="text-xs text-slate-600">
                                    <b>{a.rule_code}</b> — {a.description}
                                </span>
                            </div>
                        ))
                    )}
                </Card>
            </div>
        </div>
    );
}
