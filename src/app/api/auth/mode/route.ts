// src/app/api/auth/mode/route.ts
import { NextResponse } from 'next/server';
import { withApi, ok, fail, parseBody } from '../../../../lib/api.ts';
import { getSession } from '../../../../lib/auth/session.ts';
import { DASHBOARD_MODE_COOKIE } from '../../../../lib/auth/mode.ts';
import { z } from 'zod';

const modeSchema = z.object({
    mode: z.enum(['supervisor', 'nurse']),
});

export const runtime = 'nodejs';

export const POST = withApi({}, async ({ sb, req }) => {
    const { mode } = await parseBody(req, modeSchema);
    const session = await getSession(sb);

    if (!session.availableModes.includes(mode)) {
        return fail(403, 'FORBIDDEN_MODE', `Account does not have access to ${mode} mode.`);
    }

    const res = ok({ active_mode: mode, available_modes: session.availableModes });
    res.cookies.set(DASHBOARD_MODE_COOKIE, mode, {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return res;
});
