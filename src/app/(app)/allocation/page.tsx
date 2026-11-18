// src/app/(app)/allocation/page.tsx
import { redirect } from 'next/navigation';
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../server/repositories/shift.repository.ts';
import { latestRun } from '../../../server/repositories/assignment.repository.ts';
import { listNurses } from '../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../server/repositories/patient.repository.ts';
import { AllocationClient } from '../../../components/allocation/allocation-client.tsx';

export const dynamic = 'force-dynamic';

export default async function AllocationPage() {
    const sb = await serverClient();
    const { role } = await getSession(sb);
    if (role !== 'supervisor' && role !== 'admin') redirect('/dashboard');
    const { ward } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    const [run, nurses, { items: patients }] = await Promise.all([
        shift ? latestRun(sb, shift.id) : Promise.resolve(null),
        listNurses(sb, ward.id), listPatients(sb, ward.id),
    ]);
    return <AllocationClient run={run} shift={shift} nurses={nurses} patients={patients} role={role} />;
}