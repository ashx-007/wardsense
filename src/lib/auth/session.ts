// src/lib/auth/session.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Profile, Role, Nurse, SessionContext } from '../../types/index.ts';
import { DASHBOARD_MODE_COOKIE, getAvailableModes, resolveDashboardMode } from './mode.ts';

export async function getSession(sb: SupabaseClient, preferredMode?: string | null): Promise<SessionContext> {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        return {
            user: null,
            profile: null,
            role: null,
            linkedNurseId: null,
            linkedNurse: null,
            availableModes: [],
            activeMode: 'nurse',
        };
    }

    const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
    const role = (profile?.role as Role) ?? null;

    // Look up linked nurse record (profile_id = user.id)
    const { data: nurses } = await sb
        .from('nurses')
        .select('*, competencies:nurse_competencies(*)')
        .eq('profile_id', user.id)
        .limit(1);

    const linkedNurse = (nurses?.[0] as Nurse) ?? null;
    const linkedNurseId = linkedNurse?.id ?? null;
    const availableModes = getAvailableModes(role, Boolean(linkedNurse));

    let modeCandidate = preferredMode;
    if (!modeCandidate) {
        try {
            const cookieStore = await cookies();
            modeCandidate = cookieStore.get(DASHBOARD_MODE_COOKIE)?.value;
        } catch {
            // outside Next.js request context (e.g. tests)
        }
    }

    const activeMode = resolveDashboardMode(modeCandidate, role, Boolean(linkedNurse));

    return {
        user,
        profile: (profile as Profile) ?? null,
        role,
        linkedNurseId,
        linkedNurse,
        availableModes,
        activeMode,
    };
}
