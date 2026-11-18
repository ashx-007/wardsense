import type { Nurse, ResolvedConfig, Tier } from '../../types/index.ts';
import { fatigueMultiplier } from './fatigue.service.ts';

export function tierBaseCapacity(tier: Tier, cfg: ResolvedConfig): number { return cfg.capacity[tier]; }
export function tierMaxPatients(tier: Tier, cfg: ResolvedConfig): number { return cfg.maxPatients[tier]; }

/** Adjusted_L_max = stored base_cap × fatigue multiplier. base_cap is seeded from config at creation, per-nurse overridable. */
export function adjustedCapacity(nurse: Pick<Nurse, 'base_cap' | 'consecutive_shifts'>, cfg: ResolvedConfig): number {
    return nurse.base_cap * fatigueMultiplier(nurse.consecutive_shifts, cfg);
}