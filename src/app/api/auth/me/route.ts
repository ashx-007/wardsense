// src/app/api/auth/me/route.ts
import { withApi, ok } from '../../../../lib/api.ts';
import { getSession } from '../../../../lib/auth/session.ts';

export const runtime = 'nodejs';

export const GET = withApi({}, async ({ sb }) => {
    const session = await getSession(sb);
    return ok({
        user: session.user,
        profile: session.profile,
        role: session.role,
        linked_nurse_id: session.linkedNurseId,
        linked_nurse: session.linkedNurse,
        available_modes: session.availableModes,
        active_mode: session.activeMode,
    });
});
