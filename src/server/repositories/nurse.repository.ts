import type { SupabaseClient } from '@supabase/supabase-js';
import type { Nurse, ResolvedConfig, Tier } from '../../types/index.ts';
import { tierBaseCapacity, tierMaxPatients } from '../services/capacity.service.ts';

const SELECT = '*, competencies:nurse_competencies(*)';

export async function listNurses(sb: SupabaseClient, wardId: string): Promise<Nurse[]> {
    const { data, error } = await sb.from('nurses').select(SELECT).eq('ward_id', wardId).order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as Nurse[];
}

export async function getNurse(sb: SupabaseClient, id: string): Promise<Nurse> {
    const { data, error } = await sb.from('nurses').select(SELECT).eq('id', id).single();
    if (error || !data) throw new Error('NOT_FOUND:nurse');
    return data as Nurse;
}

export async function createNurse(sb: SupabaseClient, wardId: string, input: Record<string, unknown>, cfg: ResolvedConfig): Promise<Nurse> {
    const tier = input.tier as Tier;
    const { data, error } = await sb.from('nurses').insert({
        ...input, ward_id: wardId,
        base_cap: input.base_cap ?? tierBaseCapacity(tier, cfg),
        max_patients: input.max_patients ?? tierMaxPatients(tier, cfg),
    }).select().single();
    if (error) throw error;
    return getNurse(sb, data.id);
}

export async function updateNurse(sb: SupabaseClient, id: string, input: Record<string, unknown>): Promise<Nurse> {
    const { error } = await sb.from('nurses').update(input).eq('id', id);
    if (error) throw error;
    return getNurse(sb, id);
}

export async function deleteNurse(sb: SupabaseClient, id: string): Promise<void> {
    const { data: live } = await sb.from('assignments').select('id').eq('nurse_id', id).eq('assignment_status', 'approved').limit(1);
    if (live?.length) throw new Error('INVALID_STATE:nurse has approved assignments; reassign first.');
    const { error } = await sb.from('nurses').delete().eq('id', id);
    if (error) throw error;
}