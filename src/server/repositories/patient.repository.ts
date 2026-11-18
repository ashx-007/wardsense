import type { SupabaseClient } from '@supabase/supabase-js';
import type { Patient, PatientRequirement } from '../../types/index.ts';

const SELECT = '*, requirements:patient_requirements(*)';

export async function listPatients(sb: SupabaseClient, wardId: string, range?: { from: number; to: number }) {
    let q = sb.from('patients').select(SELECT, { count: 'exact' }).eq('ward_id', wardId).order('bed_no');
    if (range) q = q.range(range.from, range.to);
    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as Patient[], total: count ?? 0 };
}

export async function getPatient(sb: SupabaseClient, id: string): Promise<Patient> {
    const { data, error } = await sb.from('patients').select(SELECT).eq('id', id).single();
    if (error || !data) throw new Error('NOT_FOUND:patient');
    return data as Patient;
}

/** t and workload_score are trigger-computed; client-supplied values are stripped. */
export async function createPatient(sb: SupabaseClient, wardId: string, input: Record<string, unknown>): Promise<Patient> {
    const { requirements, ...fields } = input as { requirements?: PatientRequirement[] } & Record<string, unknown>;
    delete (fields as Record<string, unknown>).t; delete (fields as Record<string, unknown>).workload_score;
    const { data, error } = await sb.from('patients').insert({ ...fields, ward_id: wardId }).select().single();
    if (error) throw error;
    if (requirements?.length) {
        const { error: re } = await sb.from('patient_requirements').insert(requirements.map(r => ({ ...r, patient_id: data.id })));
        if (re) throw re;
    }
    return getPatient(sb, data.id);
}

export async function updatePatient(sb: SupabaseClient, id: string, input: Record<string, unknown>): Promise<Patient> {
    const { requirements, ...fields } = input as { requirements?: PatientRequirement[] } & Record<string, unknown>;
    delete (fields as Record<string, unknown>).t; delete (fields as Record<string, unknown>).workload_score;
    delete (fields as Record<string, unknown>).ward_id;
    if (Object.keys(fields).length) {
        const { error } = await sb.from('patients').update(fields).eq('id', id);
        if (error) throw error;
    }
    if (requirements) {
        const { error: de } = await sb.from('patient_requirements').delete().eq('patient_id', id);
        if (de) throw de;
        if (requirements.length) {
            const { error: ie } = await sb.from('patient_requirements').insert(requirements.map(r => ({ competency_code: r.competency_code, required_level: r.required_level, is_mandatory: r.is_mandatory, patient_id: id })));
            if (ie) throw ie;
        }
    }
    return getPatient(sb, id);
}

export async function deletePatient(sb: SupabaseClient, id: string): Promise<void> {
    const { data: live } = await sb.from('assignments').select('id').eq('patient_id', id).eq('assignment_status', 'approved').limit(1);
    if (live?.length) throw new Error('INVALID_STATE:patient has an approved assignment; end it before deleting.');
    const { error } = await sb.from('patients').delete().eq('id', id);
    if (error) throw error;
}