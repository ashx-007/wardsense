import type { ResolvedConfig } from '../../types/index.ts';

export function fatigueMultiplier(consecutiveShifts: number, cfg: ResolvedConfig): number {
    return consecutiveShifts >= cfg.fatigue.consecutiveShiftThreshold ? cfg.fatigue.fatigueMultiplier : 1.0;
}