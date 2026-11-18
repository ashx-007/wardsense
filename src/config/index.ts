import type { ResolvedConfig } from '../types/index.ts';
import { workloadDefaults, defaultDescriptors } from './workload.config.ts';
import { capacityDefaults, maxPatientsDefaults, fatigueDefaults, utilizationDefaults } from './capacity.config.ts';
import { safetyDefaults, competencyCatalog } from './safety.config.ts';

/** Single resolution point: defaults + ward.configuration overrides. Every service takes the resolved config. */
export function resolveConfig(raw: unknown): ResolvedConfig {
    const c = (raw ?? {}) as Record<string, any>;
    return {
        version: Number.isInteger(c.version) ? c.version : 1,
        workload: { ...workloadDefaults, ...(c.workload ?? {}) },
        capacity: { ...capacityDefaults, ...(c.capacity ?? {}) },
        maxPatients: { ...maxPatientsDefaults, ...(c.maxPatients ?? {}) },
        fatigue: { ...fatigueDefaults, ...(c.fatigue ?? {}) },
        utilization: { ...utilizationDefaults, ...(c.utilization ?? {}) },
        safety: { ...safetyDefaults, ...(c.safety ?? {}) },
        descriptors: {
            s: { ...defaultDescriptors.s, ...(c.descriptors?.s ?? {}) },
            m: { ...defaultDescriptors.m, ...(c.descriptors?.m ?? {}) },
            v: { ...defaultDescriptors.v, ...(c.descriptors?.v ?? {}) },
            d: { ...defaultDescriptors.d, ...(c.descriptors?.d ?? {}) },
        },
        competencyCatalog: Array.isArray(c.competencyCatalog) ? c.competencyCatalog : competencyCatalog,
        demoData: c.demoData === true,
    };
}

export function configVersionLabel(cfg: ResolvedConfig, wardId: string): string {
    return `${wardId.slice(0, 8)}-v${cfg.version}`;
}

/** Shallow-per-section merge used by the settings API before persisting ward.configuration. */
export function mergeConfig(current: Record<string, any>, patch: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = { ...current };
    for (const [k, v] of Object.entries(patch)) {
        if (k === 'version') continue; // version is trigger-managed
        out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(current[k] ?? {}), ...v } : v;
    }
    if (patch.descriptors) {
        out.descriptors = { ...(current.descriptors ?? {}) };
        for (const dim of ['s', 'm', 'v', 'd'] as const) {
            if (patch.descriptors[dim]) out.descriptors[dim] = { ...(current.descriptors?.[dim] ?? {}), ...patch.descriptors[dim] };
        }
    }
    return out;
}