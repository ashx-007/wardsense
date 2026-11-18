// tests/scoring.test.ts
import { describe, expect, it } from 'vitest';
import { computeWorkload, transitionWorkload } from '../src/server/services/scoring.service.ts';
import { cfg, makePatient } from './helpers.ts';

const base = { s: 1, m: 1, v: 1, d: 1, admission: false, discharge: false, pre_op: false, transfer: false, is_isolated: false };

describe('scoring — additive W = S+M+V+D+T', () => {
    it('minimum values → W=4', () => expect(computeWorkload(base, cfg).workload_score).toBe(4));
    it('maximum values, all flags → W=26', () => expect(computeWorkload({ ...base, s: 4, m: 4, v: 4, d: 4, admission: true, discharge: true, pre_op: true, transfer: true }, cfg).workload_score).toBe(26));
    it('admission alone → T=3', () => expect(transitionWorkload({ ...base, admission: true }, cfg)).toBe(3));
    it('discharge alone → T=3', () => expect(transitionWorkload({ ...base, discharge: true }, cfg)).toBe(3));
    it('pre-op alone → T=2', () => expect(transitionWorkload({ ...base, pre_op: true }, cfg)).toBe(2));
    it('transfer alone → T=2', () => expect(transitionWorkload({ ...base, transfer: true }, cfg)).toBe(2));
    it('spec example: adm+pre+transfer → T=7', () => expect(transitionWorkload({ ...base, admission: true, pre_op: true, transfer: true }, cfg)).toBe(7));
    it('spec example: S3 M4 V3 D2 T7 → W=19', () => expect(makePatient('p', 3, 4, 3, 2, { admission: true, pre_op: true, transfer: true }).workload_score).toBe(19));
    it('isolation excluded from W', () => {
        expect(computeWorkload({ ...base, s: 3, m: 4, v: 3, d: 2, is_isolated: true }, cfg).workload_score)
            .toBe(computeWorkload({ ...base, s: 3, m: 4, v: 3, d: 2 }, cfg).workload_score);
    });
    it('rejects s=0', () => expect(() => computeWorkload({ ...base, s: 0 }, cfg)).toThrow('INVALID_ACUITY:s'));
    it('rejects m=5', () => expect(() => computeWorkload({ ...base, m: 5 }, cfg)).toThrow('INVALID_ACUITY:m'));
    it('rejects non-integer', () => expect(() => computeWorkload({ ...base, v: 2.5 }, cfg)).toThrow('INVALID_ACUITY:v'));
    it('respects configured weights', () => {
        const custom = { ...cfg, workload: { ...cfg.workload, admissionWeight: 5 } };
        expect(transitionWorkload({ ...base, admission: true }, custom)).toBe(5);
    });
});