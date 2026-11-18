// src/app/(app)/patients/page.tsx
import { redirect } from 'next/navigation';
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { listPatients } from '../../../server/repositories/patient.repository.ts';
import { PatientsClient } from '../../../components/patients/patients-client.tsx';

export const dynamic = 'force-dynamic';

export default async function PatientsPage() {
    const sb = await serverClient();
    const { role } = await getSession(sb);
    if (role !== 'supervisor' && role !== 'admin') redirect('/dashboard');
    const { ward, cfg } = await getWard(sb);
    const { items } = await listPatients(sb, ward.id);
    return <PatientsClient patients={items} cfg={cfg} />;
}