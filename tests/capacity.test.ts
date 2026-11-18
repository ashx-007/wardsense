// tests/capacity.test.ts
import { describe, expect, it } from 'vitest';
import { adjustedCapacity, tierBaseCapacity, tierMaxPatients } from '../src/server/services/capacity.service.ts';
import { fatigueMultiplier } from '../src/server/services/fatigue.service.ts';
import { classifyUtilization, nurseUtilization, utilization } from '../src/server/services/utilization.service.ts';
import { cfg, makeNurse } from './helpers.ts';

describe('capacity & fatigue', () => {
    it('tier bases 32/42/48', () => {
        expect(tierBaseCapacity('junior', cfg)).toBe(32);
        expect(tierBaseCapacity('staff', cfg)).toBe(42);
        expect(tierBaseCapacity('senior', cfg)).toBe(48);
    });
    it('tier max patients 5/6/6', () => {
        expect(tierMaxPatients('junior', cfg)).toBe(5);
        expect(tierMaxPatients('staff', cfg)).toBe(6);
        expect(tierMaxPatients('senior', cfg)).toBe(6);
    });
    it('no fatigue below threshold', () => expect(fatigueMultiplier(2, cfg)).toBe(1.0));
    it('fatigue at threshold: staff 42×0.85=35.7', () => expect(adjustedCapacity(makeNurse('n', 'N', 'staff', { consecutive_shifts: 3 }), cfg)).toBeCloseTo(35.7, 10));
    it('fatigue above threshold', () => expect(fatigueMultiplier(5, cfg)).toBe(0.85));
});

describe('utilization & classification (exact, unrounded)', () => {
    it('spec example 30/35.7 = 0.840336…', () => expect(utilization(30, 35.7)).toBeCloseTo(0.8403361344537815, 12));
    it('green below 0.75', () => expect(classifyUtilization(0.749999, cfg)).toBe('green'));
    it('amber at exactly 0.75', () => expect(classifyUtilization(0.75, cfg)).toBe('amber'));
    it('amber at exactly 1.00', () => expect(classifyUtilization(1.0, cfg)).toBe('amber'));
    it('red above 1.00', () => expect(classifyUtilization(1.0000001, cfg)).toBe('red'));
    it('nurseUtilization wires fatigue + classification', () => {
        const u = nurseUtilization(makeNurse('n', 'N', 'staff', { consecutive_shifts: 3 }), 30, 3, cfg);
        expect(u.adjusted_capacity).toBeCloseTo(35.7, 10);
        expect(u.status).toBe('amber');
        expect(u.fatigue_multiplier).toBe(0.85);
    });
});