// src/app/(app)/shifts/page.tsx
import { redirect } from 'next/navigation';
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { listShifts } from '../../../server/repositories/shift.repository.ts';
import { ShiftsClient } from '../../../components/shifts/shifts-client.tsx';

export const dynamic = 'force-dynamic';

export default async function ShiftsPage() {
    const sb = await serverClient();
    const { role } = await getSession(sb);
    if (role !== 'supervisor' && role !== 'admin') redirect('/dashboard');
    const { ward } = await getWard(sb);
    return <ShiftsClient shifts={await listShifts(sb, ward.id)} />;
}