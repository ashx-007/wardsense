// tests/allocation.test.ts
import { describe, expect, it } from 'vitest';
import { planAllocation, sortPatients } from '../src/server/services/allocation.service.ts';
import { approve, cfg, input, makeNurse, makePatient } from './helpers.ts';

describe('greedy minimax allocation', () => {
    const anna = makeNurse('a', 'Anna', 'staff');
    const ben = makeNurse('b', 'Ben', 'senior');
    const p19 = makePatient('p1', 3, 4, 3, 2, { admission: true, pre_op: true, transfer: true });
    const p12 = makePatient('p2', 3, 3, 3, 3);
    const p8 = makePatient('p3', 2, 2, 2, 2);

    it('sorts by descending workload', () => expect(sortPatients([p8, p19, p12], cfg).map(p => p.id)).toEqual(['p1', 'p2', 'p3']));
    it('places in descending workload order', () => expect(planAllocation(input([anna, ben], [p8, p19, p12])).proposed.map(p => p.patient_id)).toEqual(['p1', 'p2', 'p3']));
    it('selects lowest projected utilization', () => {
        const r = planAllocation(input([anna, ben], [makePatient('q', 3, 3, 2, 2)])); // W=10: 10/48 < 10/42
        expect(r.proposed[0].nurse_id).toBe('b');
    });
    it('deterministic tie-break on equal utilization', () => {
        const a2 = makeNurse('a2', 'Anna2', 'staff');
        const r = planAllocation(input([a2, anna], [makePatient('q', 2, 2, 2, 2)]));
        expect(r.proposed[0].nurse_id).toBe('a'); // name tie-break
    });
    it('concurrent previews from the same snapshot are identical (DB advisory lock covers approve)', () => {
        const i = input([anna, ben], [p8, p19, p12]);
        expect(JSON.stringify(planAllocation(i))).toBe(JSON.stringify(planAllocation(i)));
    });
    it('enforces projected capacity → unassigned with MAX_WORKLOAD', () => {
        const jr = makeNurse('c', 'C', 'junior');
        const e1 = makePatient('e1', 4, 4, 4, 4); // 16
        const e2 = makePatient('e2', 4, 4, 4, 2); // 14 → load 30/32
        const r = planAllocation(input([jr], [e1, e2, makePatient('new', 2, 2, 2, 2)], [approve('e1', 'c'), approve('e2', 'c')]));
        expect(r.unassigned[0].patient_id).toBe('new');
        expect(r.unassigned[0].reasons.join()).toContain('MAX_WORKLOAD');
    });
    it('enforces headcount → unassigned with MAX_PATIENTS', () => {
        const jr = makeNurse('c', 'C', 'junior');
        const five = Array.from({ length: 5 }, (_, i) => makePatient(`e${i}`, 1, 1, 1, 1));
        const r = planAllocation(input([jr], [...five, makePatient('new', 1, 1, 1, 1)], five.map(p => approve(p.id, 'c'))));
        expect(r.unassigned[0].reasons.join()).toContain('MAX_PATIENTS');
    });
    it('no eligible nurse → unassigned with reason', () => {
        const r = planAllocation(input([makeNurse('x', 'X', 'staff', { availability_status: 'unavailable' })], [p12]));
        expect(r.unassigned[0].reasons.join()).toContain('NURSE_UNAVAILABLE');
    });
    it('junior high-acuity without authorization stays unassigned', () => {
        const r = planAllocation(input([makeNurse('j', 'J', 'junior')], [makePatient('big', 4, 4, 4, 4, { admission: true, discharge: true, pre_op: true, transfer: true })]));
        expect(r.unassigned[0].reasons.join()).toContain('JUNIOR_S4');
    });
    it('preserves existing approved assignments', () => {
        const r = planAllocation(input([anna], [p19, p8], [approve('p1', 'a')]));
        expect(r.proposed.map(p => p.patient_id)).toEqual(['p3']);
        expect(r.current).toHaveLength(1);
        expect(r.before.a.assigned_w).toBe(19);
    });
});