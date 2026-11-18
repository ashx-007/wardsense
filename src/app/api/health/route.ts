// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ status: 'ok', db: 'unconfigured' });
    try {
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const { error } = await sb.from('hospitals').select('id', { count: 'exact', head: true });
        if (error) throw error;
        return NextResponse.json({ status: 'ok', db: 'up' });
    } catch {
        return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 });
    }
}
