// src/app/(app)/alerts/page.tsx
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { listNurses } from '../../../server/repositories/nurse.repository.ts';
import { listPatients } from '../../../server/repositories/patient.repository.ts';
import { AlertsClient } from '../../../components/alerts/alerts-client.tsx';
import type { SafetyAlertRow } from '../../../types/index.ts';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
    const sb = await serverClient();
    const { role } = await getSession(sb);
    const { ward } = await getWard(sb);
    const { data: alerts } = await sb.from('safety_alerts').select('*').order('created_at', { ascending: false }).limit(200);
    const [nurses, { items: patients }] = await Promise.all([listNurses(sb, ward.id), listPatients(sb, ward.id)]);
    return <AlertsClient alerts={(alerts ?? []) as SafetyAlertRow[]} nurses={nurses} patients={patients} role={role!} />;
}