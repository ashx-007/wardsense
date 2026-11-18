// src/app/api/admin/users/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { rolePatchSchema, userInviteSchema } from '../../../../lib/validation/schemas.ts';
import { adminClient } from '../../../../lib/supabase/admin.ts';
export const runtime = 'nodejs';
export const GET = withApi({ roles: ['admin'] }, async ({ sb }) => {
    const { data, error } = await sb.from('profiles').select('*').order('created_at');
    if (error) throw new Error(error.message);
    return ok({ items: data ?? [] });
});
export const POST = withApi({ roles: ['admin'], limit: 10 }, async ({ req }) => {
    const b = await parseBody(req, userInviteSchema);
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: b.email, password: b.temp_password, email_confirm: true, user_metadata: { full_name: b.full_name } });
    if (error) throw new Error(error.message);
    const { error: pe } = await admin.from('profiles').update({ role: b.role, full_name: b.full_name }).eq('id', data.user.id);
    if (pe) throw pe;
    return ok({ id: data.user.id, email: b.email, role: b.role }, 201);
});
export const PATCH = withApi({ roles: ['admin'] }, async ({ sb, req }) => {
    const b = await parseBody(req, rolePatchSchema);
    const { data, error } = await sb.from('profiles').update({ role: b.role }).eq('id', b.id).select().single();
    if (error) throw new Error(error.message);
    return ok(data);
});
