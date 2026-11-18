import type { CompetencyDef } from '../types/index.ts';

export const safetyDefaults = { requireIsolationCompetency: true, isolationCompetencyCode: 'ISO', juniorHighAcuityRequiresAuth: true };

export const competencyCatalog: CompetencyDef[] = [
    { code: 'MED', name: 'Medication administration' },
    { code: 'IV', name: 'IV management' },
    { code: 'POSTOP', name: 'Post-operative care' },
    { code: 'CRIT', name: 'Critical-care experience' },
    { code: 'MON', name: 'Specialized monitoring' },
    { code: 'ISO', name: 'Isolation-care training' },
];