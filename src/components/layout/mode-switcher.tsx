// src/components/layout/mode-switcher.tsx
'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DashboardMode, Nurse } from '../../types/index.ts';
import { DASHBOARD_MODE_COOKIE } from '../../lib/auth/mode.ts';
import { Badge, cx } from '../ui.tsx';

interface ModeSwitcherProps {
    activeMode: DashboardMode;
    availableModes: DashboardMode[];
    linkedNurse?: Nurse | null;
    userName?: string;
    compact?: boolean;
}

export function DashboardModeSwitcher({
    activeMode,
    availableModes,
    linkedNurse,
    compact = false,
}: ModeSwitcherProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [switchingTo, setSwitchingTo] = useState<DashboardMode | null>(null);

    const hasNurseMode = availableModes.includes('nurse');
    const isDual = availableModes.includes('supervisor') && availableModes.includes('nurse');

    async function switchMode(target: DashboardMode) {
        if (target === activeMode || !availableModes.includes(target) || isPending) return;
        setSwitchingTo(target);

        // 1. Set cookie immediately for synchronous Next.js server component resolution
        document.cookie = `${DASHBOARD_MODE_COOKIE}=${target}; path=/; max-age=31536000; SameSite=Lax`;

        // 2. Also notify backend endpoint asynchronously
        try {
            await fetch('/api/auth/mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: target }),
            });
        } catch {
            // Cookie already set; continue
        }

        // 3. Trigger fast transition refresh to re-render server components with new mode
        startTransition(() => {
            router.refresh();
            setSwitchingTo(null);
        });
    }

    if (compact) {
        // Compact version for top header
        if (!isDual) {
            return (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700 capitalize">{activeMode} View</span>
                </div>
            );
        }

        return (
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                    type="button"
                    onClick={() => switchMode('supervisor')}
                    disabled={isPending}
                    className={cx(
                        'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                        activeMode === 'supervisor'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60',
                    )}
                >
                    Supervisor
                </button>
                <button
                    type="button"
                    onClick={() => switchMode('nurse')}
                    disabled={isPending}
                    className={cx(
                        'px-2.5 py-1 text-xs font-medium rounded-md transition-all',
                        activeMode === 'nurse'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60',
                    )}
                >
                    Nurse
                </button>
            </div>
        );
    }

    // Prominent full banner switcher on the dashboard
    return (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0f2540] text-white rounded-xl p-4 shadow-sm border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-teal-400">
                        Demonstration Mode
                    </span>
                    {isDual ? (
                        <Badge tone="teal">Dual Supervisor + Nurse</Badge>
                    ) : (
                        <Badge tone="slate">{activeMode === 'supervisor' ? 'Supervisor Account' : 'Nurse Account'}</Badge>
                    )}
                </div>
                <div className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                    <span>Active Dashboard:</span>
                    <span className="font-semibold text-white capitalize">{activeMode} Perspective</span>
                    {activeMode === 'nurse' && linkedNurse && (
                        <span className="text-xs text-teal-300 ml-1">
                            (Linked to: {linkedNurse.name} &bull; {linkedNurse.tier.toUpperCase()} RN)
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="text-xs text-slate-400 hidden md:block mr-1">Switch View:</div>
                <div className="inline-flex rounded-lg bg-black/30 p-1 border border-white/10 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => switchMode('supervisor')}
                        disabled={isPending || !availableModes.includes('supervisor')}
                        className={cx(
                            'flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5',
                            activeMode === 'supervisor'
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                    >
                        <span>Supervisor</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => switchMode('nurse')}
                        disabled={isPending || !hasNurseMode}
                        title={hasNurseMode ? 'Switch to personal Nurse view' : 'No nurse record linked to this account'}
                        className={cx(
                            'flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5',
                            activeMode === 'nurse'
                                ? 'bg-teal-600 text-white shadow'
                                : 'text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                    >
                        <span>Nurse</span>
                        {!hasNurseMode && <span className="text-[10px] opacity-75">(Unlinked)</span>}
                    </button>
                </div>
            </div>
        </div>
    );
}
