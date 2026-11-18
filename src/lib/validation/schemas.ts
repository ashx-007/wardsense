import { z } from 'zod';

export const acuitySchema = z.object({
    s: z.number().int().min(1).max(4),
    m: z.number().int().min(1).max(4),
    v: z.number().int().min(1).max(4),
    d: z.number().int().min(1).max(4),
    admission: z.boolean(), discharge: z.boolean(), pre_op: z.boolean(), transfer: z.boolean(),
    is_isolated: z.boolean(),
});

export const requirementSchema = z.object({
    competency_code: z.string().min(1).max(16),
    required_level: z.enum(['basic', 'intermediate', 'advanced']),
    is_mandatory: z.boolean(),
});

export const patientCreateSchema = acuitySchema.extend({
    bed_no: z.string().min(1).max(24),
    clinical_context: z.string().max(2000).nullable().optional(),
    requirements: z.array(requirementSchema).max(12).optional(),
});
export const patientPatchSchema = patientCreateSchema.partial();

export const nurseCreateSchema = z.object({
    name: z.string().min(1).max(120),
    tier: z.enum(['junior', 'staff', 'senior']),
    profile_id: z.string().uuid().nullable().optional(),
    availability_status: z.enum(['available', 'unavailable', 'on_leave', 'off_shift', 'restricted']).optional(),
    consecutive_shifts: z.number().int().min(0).max(30).optional(),
    is_active: z.boolean().optional(),
    base_cap: z.number().positive().max(200).optional(),
    max_patients: z.number().int().min(1).max(20).optional(),
});
export const nursePatchSchema = nurseCreateSchema.partial();

export const competencyCreateSchema = z.object({
    competency_code: z.string().min(1).max(16),
    proficiency_level: z.enum(['basic', 'intermediate', 'advanced']),
    verification_status: z.enum(['verified', 'pending', 'revoked']).optional(),
    expires_at: z.string().datetime({ offset: true }).nullable().optional(),
});
export const competencyPatchSchema = competencyCreateSchema.partial().extend({ id: z.string().uuid() });

export const shiftCreateSchema = z.object({
    shift_name: z.string().min(1).max(80),
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }),
    status: z.enum(['scheduled', 'active']).optional(),
}).refine(s => new Date(s.end_time) > new Date(s.start_time), { message: 'end_time must be after start_time' });

export const runIdSchema = z.object({ run_id: z.string().uuid() });
export const rejectSchema = runIdSchema.extend({ reason: z.string().min(4).max(500) });
export const coSignSchema = z.object({ nurse_id: z.string().uuid(), patient_id: z.string().uuid(), shift_id: z.string().uuid(), reason: z.string().min(4).max(500) });
export const alertResolveSchema = z.object({ resolution_status: z.enum(['resolved', 'dismissed']), reason: z.string().min(4).max(500) });
export const configPatchSchema = z.record(z.string(), z.unknown());
export const rolePatchSchema = z.object({ id: z.string().uuid(), role: z.enum(['nurse', 'supervisor', 'admin']) });
export const userInviteSchema = z.object({ email: z.string().email(), full_name: z.string().min(1).max(120), role: z.enum(['nurse', 'supervisor', 'admin']), temp_password: z.string().min(8).max(72) });