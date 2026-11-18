import type { Tier } from '../types/index.ts';

// Demonstration configuration values — not universal staffing standards.
export const capacityDefaults: Record<Tier, number> = { junior: 32, staff: 42, senior: 48 };
export const maxPatientsDefaults: Record<Tier, number> = { junior: 5, staff: 6, senior: 6 };
export const fatigueDefaults = { consecutiveShiftThreshold: 3, fatigueMultiplier: 0.85 };
export const utilizationDefaults = { greenThreshold: 0.75, amberThreshold: 1.0 };