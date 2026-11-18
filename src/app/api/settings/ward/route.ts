// src/app/api/settings/ward/route.ts
import { withApi, ok, parseBody } from '../../../../lib/api.ts';
import { configPatchSchema } from '../../../../lib/validation/schemas.ts';
import { getWard } from '../../../../server/repositories/ward.repository.ts';
import { mergeConfig, configVersionLabel } from '../../../../config/index.ts';
export const runtime = 'nodejs';
export const GET = withApi({ roles: ['supervisor', 'admin'] }, async ({ sb }) => {
    const { ward, cfg } = await getWard(sb);
    return ok({ ward_id: ward.id, config: cfg, config_version: configVersionLabel(cfg, ward.id) });
});
export const PATCH = withApi({ roles: ['admin'] }, async ({ sb, req }) => {
    const patch = await parseBody(req, configPatchSchema);
    const { ward } = await getWard(sb);
    const merged = mergeConfig(ward.configuration as Record<string, unknown>, patch);
    const { data, error } = await sb.from('wards').update({ configuration: merged }).eq('id', ward.id).select().single();
    if (error) throw error;
    return ok({ configuration: data.configuration });
});
