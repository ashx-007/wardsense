// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { serverClient } from '../../../../lib/supabase/server.ts';

export const runtime = 'nodejs';

export async function POST() {
    try {
        const sb = await serverClient();
        const { error } = await sb.auth.signOut();
        if (error) return NextResponse.json({ error: { code: 'LOGOUT_FAILED', message: error.message } }, { status: 500 });
        return NextResponse.json({ data: { message: 'Signed out successfully.' } });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: { code: 'INTERNAL', message: msg } }, { status: 500 });
    }
}

