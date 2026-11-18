// tests/rebalance.test.ts
import { describe, expect, it } from 'vitest';
import { planRebalance } from '../src/server/services/rebalance.service.ts';
import { approve, input, makeComp, makeNurse, makePatient, req } from './helpers.ts';

describe('smart rebalance (preview only)', () => {
    const anna = makeNurse('a', 'Anna', 'staff');   // cap 42
    const ben = makeNurse('b', 'Ben', 'senior');    // cap 48
    const pa = makePatient('pa', 3, 4, 3, 2, { admission: true, pre_op: true, transfer: true }); // 19
    const pb = makePatient('pb', 4, 4, 3, 3); // 14
    const pc = makePatient('pc', 3, 3, 3, 3); // 12
    const pd = makePatient('pd', 3, 3, 2, 2); // 10

    it('moves from overloaded nurse, reduces ward max, target stays ≤ 1.0', () => {
        const r = planRebalance(input([anna, ben], [pa, pb, pc, pd], [approve('pa', 'a'), approve('pb', 'a'), approve('pc', 'a'), approve('pd', 'b')]));
        expect(((r as unknown as { moves?: unknown[] }).moves) ?? r.proposed.filter(p => p.from_nurse_id)).toHaveLength(1);
        const move = r.proposed.find(p => p.from_nurse_id)!;
        expect(move.from_nurse_id).toBe('a');
        expect(r.max_after).toBeLessThan(r.max_before);
        expect(r.after[move.nurse_id].utilization).toBeLessThanOrEqual(1.0);
        expect(r.after.a.utilization).toBeLessThanOrEqual(1.0);
        expect(move.explanation).toContain('Relieves');
    });
    it('never mutates the input assignments (approval is a separate transaction)', () => {
        const assignments = [approve('pa', 'a'), approve('pb', 'a'), approve('pc', 'a'), approve('pd', 'b')];
        const snapshot = JSON.stringify(assignments);
        planRebalance(input([anna, ben], [pa, pb, pc, pd], assignments));
        expect(JSON.stringify(assignments)).toBe(snapshot);
    });
    it('balanced ward → no moves', () => {
        const r = planRebalance(input([anna, ben], [pa, pd], [approve('pa', 'a'), approve('pd', 'b')]));
        expect(r.proposed.filter(p => p.from_nurse_id)).toHaveLength(0);
    });
    it('never moves a patient to a nurse lacking a mandatory competency', () => {
        const restricted = makePatient('pr', 4, 4, 4, 4, {}, [req('CRIT')]); // 16
        const r = planRebalance(input([anna, ben], [restricted, pb, pa], [approve('pr', 'a'), approve('pb', 'a'), approve('pa', 'a')]));
        expect(r.proposed.filter(p => p.from_nurse_id).every(p => p.patient_id !== 'pr')).toBe(true);
    });
    it('moves to competency-verified target when available', () => {
        const restricted = makePatient('pr', 4, 4, 4, 4, {}, [req('CRIT')]);
        const benVerified = makeNurse('b', 'Ben', 'senior', { competencies: [makeComp('CRIT')] });
        const r = planRebalance(input([anna, benVerified], [restricted, pb, pa], [approve('pr', 'a'), approve('pb', 'a'), approve('pa', 'a')]));
        expect(r.proposed.some(p => p.from_nurse_id === 'a' && p.nurse_id === 'b')).toBe(true);
    });
    it('also places unassigned patients after moves', () => {
        const un = makePatient('un', 2, 2, 2, 2);
        const r = planRebalance(input([anna, ben], [pa, pb, pc, pd, un], [approve('pa', 'a'), approve('pb', 'a'), approve('pc', 'a'), approve('pd', 'b')]));
        expect(r.proposed.some(p => p.patient_id === 'un' && !p.from_nurse_id)).toBe(true);
    });
});