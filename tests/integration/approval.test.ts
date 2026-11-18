// tests/integration/approval.test.ts — requires Supabase connection
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Ensure .env.local is loaded even if run standalone
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
                process.env[key] = val;
            }
        }
    }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const canRun = Boolean(url && service && anon);

describe.skipIf(!canRun)('approve_allocation_run — concurrent approvals', () => {
    let admin: any;
    const ids: Record<string, string> = {};
    const email = `sup-${Date.now()}@test.local`;
    const password = 'IntegrationTest!123';

    beforeAll(async () => {
        admin = createClient<any>(url, service, { auth: { persistSession: false } });
        const { data: hosp } = await admin.from('hospitals').insert({ name: 'IT Hospital' }).select().single();
        const { data: ward } = await admin.from('wards').insert({ hospital_id: hosp!.id, name: 'IT Ward', configuration: { version: 1 } }).select().single();
        const { data: nurse } = await admin.from('nurses').insert({ ward_id: ward!.id, name: 'IT Nurse', tier: 'senior', base_cap: 48, max_patients: 6 }).select().single();
        const { data: patient } = await admin.from('patients').insert({ ward_id: ward!.id, bed_no: 'IT-1', s: 2, m: 2, v: 2, d: 2 }).select().single();
        const { data: shift } = await admin.from('shifts').insert({ ward_id: ward!.id, shift_name: 'IT Shift', start_time: new Date().toISOString(), end_time: new Date(Date.now() + 36e5).toISOString(), status: 'active' }).select().single();
        
        // Create user and initialize profile with supervisor role
        const { data: user } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        await admin.from('profiles').delete().eq('id', user.user!.id);
        await admin.from('profiles').insert({ id: user.user!.id, full_name: 'IT Supervisor', role: 'supervisor' });

        const result = { algorithm_version: 'it', mode: 'assign', current: [], proposed: [{ patient_id: patient!.id, nurse_id: nurse!.id, workload: 8, projected_utilization: 8 / 48, explanation: 'it' }], unassigned: [], ineligible_nurses: [], violations: [], before: {}, after: {}, max_before: 0, max_after: 8 / 48 };
        const { data: run } = await admin.from('allocation_runs').insert({ shift_id: shift!.id, algorithm_version: 'it', config_version: 'it-v1', status: 'preview', input_snapshot: {}, result_snapshot: result, created_by: user.user!.id }).select().single();
        Object.assign(ids, { ward: ward!.id, run: run!.id, user: user.user!.id, hosp: hosp!.id });
    }, 30_000);

    afterAll(async () => {
        if (ids.hosp) await admin.from('hospitals').delete().eq('id', ids.hosp); // cascades
        if (ids.user) await admin.auth.admin.deleteUser(ids.user);
    });

    it('exactly one of two concurrent approvals succeeds', async () => {
        const sb = createClient<any>(url, anon, { auth: { persistSession: false } });
        const { error } = await sb.auth.signInWithPassword({ email, password });
        expect(error).toBeNull();
        const results = await Promise.allSettled([
            sb.rpc('approve_allocation_run', { p_run_id: ids.run }).then(r => { if (r.error) throw r.error; return r.data; }),
            sb.rpc('approve_allocation_run', { p_run_id: ids.run }).then(r => { if (r.error) throw r.error; return r.data; }),
        ]);
        const okCount = results.filter(r => r.status === 'fulfilled').length;
        expect(okCount).toBe(1);
        const { data: assignments } = await admin.from('assignments').select('*').eq('shift_id', (await admin.from('allocation_runs').select('shift_id').eq('id', ids.run).single()).data!.shift_id);
        expect(assignments!.filter((a: any) => a.assignment_status === 'approved')).toHaveLength(1);
    }, 30_000);
});
