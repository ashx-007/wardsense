// src/components/dashboard/nurse-home.tsx
import Link from 'next/link';
import type { Assignment, Nurse, NurseUtilization, SafetyAlertRow, Shift } from '../../types/index.ts';
import { Badge, Card, Empty, UtilBar } from '../ui.tsx';

export function NurseHome({
    nurse,
    util,
    assignments,
    shift,
    alerts,
    isSupervisor = false,
}: {
    nurse: Nurse | null;
    util: NurseUtilization | null;
    assignments: Assignment[];
    shift: Shift | null;
    alerts: SafetyAlertRow[];
    isSupervisor?: boolean;
}) {
    if (!nurse) {
        return (
            <Card title="Nurse Dashboard">
                <div className="py-6 text-center space-y-3">
                    <div className="text-amber-600 font-medium text-base">
                        No Nurse Record Linked to this Account
                    </div>
                    <p className="text-sm text-slate-600 max-w-lg mx-auto">
                        Your account is currently viewing the <b>Nurse Perspective</b>, but your login is not yet associated with a staff nurse record in the ward database.
                    </p>
                    {isSupervisor && (
                        <div className="pt-2">
                            <Link href="/nurses" className="btn btn-primary text-xs">
                                Open Nurse Management &rarr; Link to an RN Record
                            </Link>
                        </div>
                    )}
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
                <Card title="My Workload">
                    {util ? (
                        <>
                            <p className="text-2xl font-semibold text-slate-800">{util.assigned_w} pts</p>
                            <UtilBar u={util.utilization} status={util.status} />
                            <p className="text-xs text-slate-500 mt-1">
                                Capacity {util.adjusted_capacity.toFixed(1)}
                                {util.fatigue_multiplier < 1 ? ` (fatigue ×${util.fatigue_multiplier})` : ''} · {util.patient_count}/{nurse.max_patients} patients
                            </p>
                        </>
                    ) : (
                        <Empty>—</Empty>
                    )}
                </Card>
                <Card title="My Shift">
                    {shift ? (
                        <>
                            <p className="font-medium text-slate-800">{shift.shift_name}</p>
                            <p className="text-xs text-slate-500">
                                {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="mt-1">
                                <Badge tone="green">{shift.status}</Badge>
                            </div>
                        </>
                    ) : (
                        <Empty>No active shift.</Empty>
                    )}
                </Card>
                <Card title="My Verified Competencies">
                    <div className="flex flex-wrap gap-1">
                        {nurse.competencies.map(c => (
                            <Badge key={c.id} tone={c.verification_status === 'verified' ? 'green' : 'amber'}>
                                {c.competency_code} · {c.proficiency_level}
                            </Badge>
                        ))}
                        {nurse.competencies.length === 0 && <Empty>None recorded.</Empty>}
                    </div>
                </Card>
            </div>

            <Card title={`My Assigned Patients (${assignments.length})`}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="th">Bed</th>
                                <th className="th">Workload</th>
                                <th className="th">Clinical Flags</th>
                                <th className="th">Clinical Context</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50">
                                    <td className="td font-medium text-slate-800">{a.patient?.bed_no}</td>
                                    <td className="td font-semibold text-teal-700">{a.workload_score}</td>
                                    <td className="td space-x-1">
                                        {a.patient?.is_isolated && <Badge tone="amber">ISO</Badge>}
                                        {a.patient?.admission && <Badge tone="blue">ADM</Badge>}
                                        {a.patient?.discharge && <Badge tone="blue">DIS</Badge>}
                                        {a.patient?.pre_op && <Badge tone="teal">PRE</Badge>}
                                        {a.patient?.transfer && <Badge tone="teal">TRF</Badge>}
                                    </td>
                                    <td className="td text-xs text-slate-600">{a.patient?.clinical_context || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {assignments.length === 0 && <Empty>No approved patient assignments for this shift.</Empty>}
            </Card>

            <Card title="My Safety & Allocation Notifications">
                {alerts.length === 0 ? (
                    <Empty>No open safety alerts for your assignments.</Empty>
                ) : (
                    alerts.map(a => (
                        <div key={a.id} className="py-2 border-b border-slate-100 last:border-0 text-sm flex items-start gap-2">
                            <Badge tone={a.severity}>{a.severity}</Badge>
                            <span className="text-xs text-slate-700 leading-snug">
                                <b>{a.rule_code}</b> — {a.description}
                            </span>
                        </div>
                    ))
                )}
            </Card>
        </div>
    );
}
