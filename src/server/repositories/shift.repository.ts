import type { SupabaseClient } from '@supabase/supabase-js';
import type { Shift } from '../../types/index.ts';

export async function listShifts(sb: SupabaseClient, wardId: string): Promise<Shift[]> {
    const { data, error } = await sb.from('shifts').select('*').eq('ward_id', wardId).order('start_time', { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as Shift[];
}

export async function getActiveShift(sb: SupabaseClient, wardId: string): Promise<Shift | null> {
    const { data } = await sb.from('shifts').select('*').eq('ward_id', wardId).eq('status', 'active').limit(1);
    return (data?.[0] as Shift) ?? null;
}

export async function getShift(sb: SupabaseClient, id: string): Promise<Shift> {
    const { data, error } = await sb.from('shifts').select('*').eq('id', id).single();
    if (error || !data) throw new Error('NOT_FOUND:shift');
    return data as Shift;
}

export async function createShift(sb: SupabaseClient, wardId: string, input: Record<string, unknown>): Promise<Shift> {
    const { data, error } = await sb.from('shifts').insert({ ...input, ward_id: wardId }).select().single();
    if (error) throw error;
    return data as Shift;
}