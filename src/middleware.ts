// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({ request: req });
    const sb = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => req.cookies.getAll(),
                setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
                    list.forEach(({ name, value }) => req.cookies.set(name, value));
                    res = NextResponse.next({ request: req });
                    list.forEach(({ name, value, options }) => res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]));
                },
            },
        },
    );
    const { data: { user } } = await sb.auth.getUser();
    const path = req.nextUrl.pathname;
    const isPublic = path === '/login' || path.startsWith('/api/health') || path.startsWith('/_next') || path === '/favicon.ico';
    if (!user && !isPublic && !path.startsWith('/api')) {
        const url = req.nextUrl.clone(); url.pathname = '/login';
        return NextResponse.redirect(url);
    }
    if (user && path === '/login') {
        const url = req.nextUrl.clone(); url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }
    return res; // API role enforcement lives in withApi + RLS, never in the client
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };