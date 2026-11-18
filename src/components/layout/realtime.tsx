// src/components/layout/realtime.tsx
'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase/browser.ts';

const TABLES = ['patients', 'nurses', 'assignments', 'safety_alerts', 'shifts', 'allocation_runs'];

/** One channel per ward, debounced server refresh — no duplicate handlers, no stale client caches.
 *  Clinical writes are never optimistic: server recomputes scores, then realtime refreshes. */
export function RealtimeProvider({ wardId, children }: { wardId: string; children: ReactNode }) {
    const router = useRouter();
    useEffect(() => {
        const sb = browserClient();
        let timer: ReturnType<typeof setTimeout> | null = null;
        const channel = sb.channel(`ward-${wardId}`);
        for (const table of TABLES) {
            channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => router.refresh(), 300);
            });
        }
        channel.subscribe();
        return () => { if (timer) clearTimeout(timer); sb.removeChannel(channel); };
    }, [wardId, router]);
    return <>{children}</>;
}