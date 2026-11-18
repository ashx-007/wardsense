// tests/safety.test.ts
import { describe, expect, it } from 'vitest';
import { validateAssignment, isBlocked } from '../src/server/services/safety.service.ts';
import { cfg, makeComp, makeNurse, makePatient, req, shift, NOW } from './helpers.ts';
import type { Nurse, Patient, SeniorAuthorization } from '../src/types/index.ts';

function vio(nurse: Nurse, patient: Patient, load = 0, count = 0, auths: SeniorAuthorization[] = [], sh = shift) {
    return validateAssignment({ nurse, patient, shift: sh, currentLoad: load, currentCount: count, authorizations: auths, cfg, now: NOW });
}
const codes = (vs: ReturnType<typeof vio>) => vs.map(v => v.rule_code);

describe('safety engine', () => {
    const junior = makeNurse('j', 'Junior', 'junior');
    it('junior + S=4 blocked without authorization', () => {
        const vs = vio(junior, makePatient('p1', 4, 1, 1, 1));
        expect(codes(vs)).toContain('JUNIOR_S4'); expect(isBlocked(vs)).toBe(true);
    });
    it('junior + M=4 blocked without authorization', () => expect(codes(vio(junior, makePatient('p2', 1, 4, 1, 1)))).toContain('JUNIOR_M4'));
    it('co-sign downgrades to WARNING, does not bypass other rules', () => {
        const p = makePatient('p1', 4, 1, 1, 1);
        const auth: SeniorAuthorization = { id: 'x', nurse_id: 'j', patient_id: 'p1', shift_id: 's1', authorized_by: 'sup', reason: 'reviewed' };
        const vs = vio(junior, p, 0, 0, [auth]);
        expect(vs.find(v => v.rule_code === 'JUNIOR_S4')?.severity).toBe('WARNING');
        expect(isBlocked(vs)).toBe(false);
        const overloaded = vio(junior, p, 30, 0, [auth]); // co-sign must NOT bypass capacity
        expect(codes(overloaded)).toContain('MAX_WORKLOAD');
    });
    it('missing mandatory competency blocks even a senior', () => {
        const senior = makeNurse('s', 'Senior', 'senior');
        expect(codes(vio(senior, makePatient('p3', 2, 2, 2, 2, {}, [req('CRIT')])))).toContain('COMPETENCY_MISSING');
    });
    it('verified competency passes', () => {
        const senior = makeNurse('s', 'Senior', 'senior', { competencies: [makeComp('CRIT')] });
        expect(vio(senior, makePatient('p3', 2, 2, 2, 2, {}, [req('CRIT')]))).toHaveLength(0);
    });
    it('expired competency blocks', () => {
        const n = makeNurse('s', 'S', 'senior', { competencies: [makeComp('CRIT', 'advanced', 'verified', '2026-01-01T00:00:00Z')] });
        expect(codes(vio(n, makePatient('p3', 2, 2, 2, 2, {}, [req('CRIT')])))).toContain('COMPETENCY_EXPIRED');
    });
    it('unverified competency blocks', () => {
        const n = makeNurse('s', 'S', 'senior', { competencies: [makeComp('CRIT', 'advanced', 'pending')] });
        expect(codes(vio(n, makePatient('p3', 2, 2, 2, 2, {}, [req('CRIT')])))).toContain('COMPETENCY_UNVERIFIED');
    });
    it('insufficient proficiency blocks', () => {
        const n = makeNurse('s', 'S', 'senior', { competencies: [makeComp('CRIT', 'basic')] });
        expect(codes(vio(n, makePatient('p3', 2, 2, 2, 2, {}, [req('CRIT', 'advanced')])))).toContain('COMPETENCY_LEVEL');
    });
    it('optional competency missing → WARNING only', () => {
        const vs = vio(makeNurse('s', 'S', 'senior'), makePatient('p3', 2, 2, 2, 2, {}, [req('POSTOP', 'basic', false)]));
        expect(vs[0].severity).toBe('WARNING'); expect(isBlocked(vs)).toBe(false);
    });
    it('inactive nurse blocked', () => expect(codes(vio(makeNurse('n', 'X', 'staff', { is_active: false }), makePatient('p', 1, 1, 1, 1)))).toContain('NURSE_INACTIVE'));
    it('unavailable nurse blocked', () => expect(codes(vio(makeNurse('n', 'X', 'staff', { availability_status: 'on_leave' }), makePatient('p', 1, 1, 1, 1)))).toContain('NURSE_UNAVAILABLE'));
    it('non-active shift blocked', () => expect(codes(vio(makeNurse('n', 'X', 'staff'), makePatient('p', 1, 1, 1, 1), 0, 0, [], { ...shift, status: 'closed' }))).toContain('SHIFT_MISMATCH'));
    it('headcount enforced at N_max', () => expect(codes(vio(junior, makePatient('p', 1, 1, 1, 1), 20, 5))).toContain('MAX_PATIENTS'));
    it('capacity enforced', () => expect(codes(vio(junior, makePatient('p', 4, 4, 4, 4), 20, 1))).toContain('MAX_WORKLOAD'));
    it('isolation without ISO competency blocked', () => expect(codes(vio(makeNurse('s', 'S', 'senior'), makePatient('p', 2, 2, 2, 2, { is_isolated: true })))).toContain('ISOLATION_POLICY'));
    it('isolation with verified ISO passes', () => {
        const n = makeNurse('s', 'S', 'senior', { competencies: [makeComp('ISO', 'basic')] });
        expect(vio(n, makePatient('p', 2, 2, 2, 2, { is_isolated: true }))).toHaveLength(0);
    });
});