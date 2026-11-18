// src/app/(app)/settings/page.tsx
import { redirect } from 'next/navigation';
import { serverClient } from '../../../lib/supabase/server.ts';
import { getSession } from '../../../lib/auth/session.ts';
import { getWard } from '../../../server/repositories/ward.repository.ts';
import { configVersionLabel } from '../../../config/index.ts';
import { SettingsClient } from '../../../components/settings/settings-client.tsx';
import type { Profile } from '../../../types/index.ts';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const sb = await serverClient();
    const { role } = await getSession(sb);
    if (role !== 'admin') redirect('/dashboard');
    const { ward, cfg } = await getWard(sb);
    const { data: profiles } = await sb.from('profiles').select('*').order('created_at');
    return <SettingsClient cfg={cfg} configVersion={configVersionLabel(cfg, ward.id)} profiles={(profiles ?? []) as Profile[]} />;
}