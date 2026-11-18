import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ZodError, type ZodType } from 'zod';
import { serverClient } from './supabase/server.ts';
import { getSession } from './auth/session.ts';
import type { Role } from '../types/index.ts';

export interface ApiCtx { sb: SupabaseClient; user: { id: string; email?: string }; role: Role; req: NextRequest; params: Record<string, string>; }

export function ok(data: unknown, status = 200) { return NextResponse.json({ data }, { status }); }
export function fail(status: number, code: string, message: string, details?: unknown) {
    return NextResponse.json({ error: { code, message, ...(details !== undefined ? { details } : {}) } }, { status });
}

// In-memory sliding window. Single-instance scope; use Redis/Upstash for multi-instance deployments.
const g = globalThis as unknown as { __wsBuckets?: Map<string, number[]> };
g.__wsBuckets ??= new Map();
function rateLimited(key: string, limit: number, windowMs = 60_000): boolean {
    const now = Date.now();
    const hits = (g.__wsBuckets!.get(key) ?? []).filter(t => now - t < windowMs);
    hits.push(now);
    g.__wsBuckets!.set(key, hits);
    return hits.length > limit;
}

function logError(e: unknown, path: string, userId?: string) {
    // Structured, no patient-identifiable data.
    console.error(JSON.stringify({ level: 'error', path, userId, message: e instanceof Error ? e.message : String(e) }));
}

export function mapError(e: unknown): NextResponse {
    if (e instanceof ZodError) return fail(422, 'VALIDATION', 'Request validation failed', e.issues);
    const msg = e instanceof Error ? e.message : String(e);
    const pg = e as { code?: string };
    if (pg?.code === '23505') return fail(409, 'CONFLICT', 'Unique constraint violation (duplicate or concurrent allocation).');
    if (pg?.code === '23503') return fail(409, 'FK_VIOLATION', 'Referenced record does not exist.');
    if (msg.startsWith('INVALID_ACUITY') || msg.startsWith('INVALID_')) return fail(422, 'VALIDATION', msg);
    if (msg.startsWith('NOT_FOUND')) return fail(404, 'NOT_FOUND', msg);
    if (msg.startsWith('NOT_CONFIGURED')) return fail(503, 'NOT_CONFIGURED', msg);
    if (msg.startsWith('FORBIDDEN')) return fail(403, 'FORBIDDEN', msg);
    if (msg.startsWith('NO_ACTIVE_SHIFT') || msg.startsWith('SHIFT_NOT_ACTIVE') || msg.startsWith('INVALID_STATE') || msg.startsWith('STALE_') || msg.startsWith('ALREADY_ASSIGNED')
        || /^(MAX_PATIENTS|MAX_WORKLOAD|NURSE_INACTIVE|NURSE_UNAVAILABLE|COMPETENCY|ISOLATION_POLICY|SENIOR_AUTH_REQUIRED|WARD_MISMATCH)/.test(msg))
        return fail(409, 'SAFETY_REVALIDATION_FAILED', msg);
    return fail(500, 'INTERNAL', 'Unexpected server error.');
}

export function withApi(
    opts: { roles?: Role[]; limit?: number },
    handler: (ctx: ApiCtx) => Promise<NextResponse>,
) {
    return async (req: NextRequest, seg: { params: Promise<Record<string, string>> }) => {
        let userId: string | undefined;
        try {
            const sb = await serverClient();
            const { user, role } = await getSession(sb);
            if (!user || !role) return fail(401, 'UNAUTHENTICATED', 'Sign in required.');
            userId = user.id;
            if (opts.roles && !opts.roles.includes(role)) return fail(403, 'FORBIDDEN', `Requires role: ${opts.roles.join(' or ')}.`);
            if (rateLimited(`${user.id}:${req.nextUrl.pathname}`, opts.limit ?? 120)) return fail(429, 'RATE_LIMITED', 'Too many requests; retry shortly.');
            const params = seg?.params ? await seg.params : {};
            return await handler({ sb, user, role, req, params });
        } catch (e) {
            logError(e, req.nextUrl.pathname, userId);
            return mapError(e);
        }
    };
}

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
    return schema.parse(await req.json());
}
export function pageParams(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page') ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(sp.get('page_size') ?? 25) || 25));
    return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1, sp };
}