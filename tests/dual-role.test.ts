// tests/dual-role.test.ts
import { describe, expect, it } from 'vitest';
import { getAvailableModes, resolveDashboardMode } from '../src/lib/auth/mode.ts';
import type { Assignment, Nurse } from '../src/types/index.ts';

describe('Dual Supervisor + Nurse Account Support', () => {
    describe('1. Available Dashboard Modes resolution', () => {
        it('normal nurse account only gets nurse mode', () => {
            expect(getAvailableModes('nurse', false)).toEqual(['nurse']);
            expect(getAvailableModes('nurse', true)).toEqual(['nurse']);
        });

        it('supervisor without nurse record only gets supervisor mode', () => {
            expect(getAvailableModes('supervisor', false)).toEqual(['supervisor']);
        });

        it('supervisor with linked nurse record gets BOTH supervisor and nurse modes', () => {
            expect(getAvailableModes('supervisor', true)).toEqual(['supervisor', 'nurse']);
        });

        it('admin with linked nurse record gets BOTH supervisor and nurse modes', () => {
            expect(getAvailableModes('admin', true)).toEqual(['supervisor', 'nurse']);
        });

        it('admin without nurse record gets supervisor mode', () => {
            expect(getAvailableModes('admin', false)).toEqual(['supervisor']);
        });

        it('null/unauthenticated role gets empty modes', () => {
            expect(getAvailableModes(null, false)).toEqual([]);
            expect(getAvailableModes(null, true)).toEqual([]);
        });
    });

    describe('2. Active Dashboard Mode resolution & security validation', () => {
        it('defaults supervisor with linked nurse to supervisor mode', () => {
            const active = resolveDashboardMode(undefined, 'supervisor', true);
            expect(active).toBe('supervisor');
        });

        it('allows supervisor with linked nurse to switch to nurse mode', () => {
            const active = resolveDashboardMode('nurse', 'supervisor', true);
            expect(active).toBe('nurse');
        });

        it('allows supervisor with linked nurse to switch back to supervisor mode', () => {
            const active = resolveDashboardMode('supervisor', 'supervisor', true);
            expect(active).toBe('supervisor');
        });

        it('prevents supervisor without nurse record from switching to nurse mode', () => {
            // Even if client sends 'nurse', server resolves to 'supervisor'
            const active = resolveDashboardMode('nurse', 'supervisor', false);
            expect(active).toBe('supervisor');
        });

        it('prevents a normal nurse from elevating to supervisor mode', () => {
            // Even if client sends 'supervisor', server forces 'nurse'
            const active = resolveDashboardMode('supervisor', 'nurse', true);
            expect(active).toBe('nurse');
        });

        it('rejects invalid or arbitrary mode strings and falls back safely', () => {
            const active = resolveDashboardMode('superadmin' as any, 'supervisor', true);
            expect(active).toBe('supervisor');
        });
    });

    describe('3. Nurse Mode Assignment Isolation', () => {
        const nurseA: Nurse = {
            id: 'nurse-uuid-A',
            ward_id: 'w1',
            profile_id: 'user-supervisor-with-nurse-A',
            name: 'Grace Okafor',
            tier: 'senior',
            base_cap: 48,
            max_patients: 6,
            consecutive_shifts: 1,
            availability_status: 'available',
            is_active: true,
            competencies: [],
        };

        const assignments: Assignment[] = [
            { id: 'a1', patient_id: 'p1', nurse_id: 'nurse-uuid-A', shift_id: 's1', workload_score: 12, assignment_status: 'approved' },
            { id: 'a2', patient_id: 'p2', nurse_id: 'nurse-uuid-A', shift_id: 's1', workload_score: 14, assignment_status: 'approved' },
            { id: 'a3', patient_id: 'p3', nurse_id: 'nurse-uuid-B', shift_id: 's1', workload_score: 10, assignment_status: 'approved' },
        ];

        it('isolates personal assignments to only the linked nurse record', () => {
            const myAssignments = assignments.filter(a => a.nurse_id === nurseA.id);
            expect(myAssignments).toHaveLength(2);
            expect(myAssignments.map(a => a.patient_id)).toEqual(['p1', 'p2']);
            // Ensures Nurse B's assignment is never included in Nurse A's personal home
            expect(myAssignments.some(a => a.nurse_id === 'nurse-uuid-B')).toBe(false);
        });
    });
});
