import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Service-role client. Server-only; never import from a client component. */
export function adminClient() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('NOT_CONFIGURED:SUPABASE_SERVICE_ROLE_KEY');
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}