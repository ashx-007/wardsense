// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = loginSchema.parse(await req.json());
        const store = await cookies();
        const sb = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => store.getAll(),
                    setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options as Parameters<typeof store.set>[2])); } catch { /* read-only context */ } },
                },
            },
        );
        const { data, error } = await sb.auth.signInWithPassword({ email: body.email, password: body.password });
        if (error) return NextResponse.json({ error: { code: 'AUTH_FAILED', message: error.message } }, { status: 401 });
        const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
        return NextResponse.json({ data: { user: data.user, profile, session: data.session } });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: { code: 'BAD_REQUEST', message: msg } }, { status: 400 });
    }
}
