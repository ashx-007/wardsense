// src/lib/auth/mode.ts
import type { DashboardMode, Role } from '../../types/index.ts';

export const DASHBOARD_MODE_COOKIE = 'ws_dashboard_mode';

/**
 * Returns the list of permitted dashboard modes for an account.
 * - Nurse: only 'nurse'
 * - Supervisor/Admin without nurse record: only 'supervisor'
 * - Supervisor/Admin with linked nurse record: ['supervisor', 'nurse']
 */
export function getAvailableModes(role: Role | null, hasLinkedNurse: boolean): DashboardMode[] {
    if (!role) return [];
    if (role === 'nurse') return ['nurse'];
    if (role === 'supervisor' || role === 'admin') {
        return hasLinkedNurse ? ['supervisor', 'nurse'] : ['supervisor'];
    }
    return ['nurse'];
}

/**
 * Resolves the active dashboard mode securely.
 * The active mode CANNOT exceed the account's available modes.
 * Client requests (via cookie or query param) are strictly validated against available modes.
 */
export function resolveDashboardMode(
    requestedMode: string | null | undefined,
    role: Role | null,
    hasLinkedNurse: boolean,
): DashboardMode {
    const available = getAvailableModes(role, hasLinkedNurse);
    if (available.length === 0) return 'nurse';
    if (requestedMode && (available as string[]).includes(requestedMode)) {
        return requestedMode as DashboardMode;
    }
    // Default to 'supervisor' for supervisors/admins, 'nurse' for nurses
    return available[0];
}
