// src/app/(app)/nurses/page.tsx
import { redirect } from 'next/navigation';
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { getActiveShift } from '../../../server/repositories/shift.repository.ts';
import { listNurses } from '../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../server/repositories/patient.repository.ts';
import { currentAssignments } from '../../../server/repositories/assignment.repository.ts';
import { wardUtilizations } from '../../../server/services/utilization.service.ts';
import { NursesClient } from '../../../components/nurses/nurses-client.tsx';

export const dynamic = 'force-dynamic';

export default async function NursesPage() {
    const sb = await serverClient();
    const { role } = await getSession(sb);
    if (role !== 'supervisor' && role !== 'admin') redirect('/dashboard');
    const { ward, cfg } = await getWard(sb);
    const shift = await getActiveShift(sb, ward.id);
    const [nurses, { items: patients }] = await Promise.all([listNurses(sb, ward.id), listPatients(sb, ward.id)]);
    const assignments = shift ? await currentAssignments(sb, shift.id) : [];
    const utils = wardUtilizations(nurses, patients, assignments, shift?.id ?? null, cfg);
    return <NursesClient nurses={nurses} utils={utils} cfg={cfg} />;
}