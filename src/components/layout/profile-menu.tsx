// src/components/layout/profile-menu.tsx
'use client';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase/browser.ts';
import type { DashboardMode, Nurse, Role } from '../../types/index.ts';
import { Badge } from '../ui.tsx';

export function ProfileMenu({
    name,
    role,
    linkedNurse,
    activeMode,
}: {
    name: string;
    role: Role;
    linkedNurse?: Nurse | null;
    activeMode?: DashboardMode;
}) {
    const router = useRouter();

    async function signOut() {
        await browserClient().auth.signOut();
        // Clear mode cookie
        document.cookie = 'ws_dashboard_mode=; path=/; max-age=0';
        router.replace('/login');
        router.refresh();
    }

    return (
        <details className="relative">
            <summary className="list-none cursor-pointer flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors">
                <span className="h-8 w-8 rounded-full bg-teal-600 text-white text-sm font-semibold flex items-center justify-center">
                    {name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:block text-sm font-medium text-slate-800">{name}</span>
                <Badge tone={role === 'admin' ? 'teal' : role === 'supervisor' ? 'blue' : 'slate'}>
                    {role}
                </Badge>
                {linkedNurse && (
                    <span className="hidden md:inline-flex items-center text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                        RN: {linkedNurse.name.split(' ')[0]}
                    </span>
                )}
            </summary>
            <div className="absolute right-0 mt-2 w-64 card !p-3 z-40 shadow-lg border border-slate-200">
                <div className="border-b border-slate-100 pb-2 mb-2">
                    <p className="text-xs font-semibold text-slate-800">{name}</p>
                    <p className="text-[11px] text-slate-500">Primary Role: <b className="capitalize text-slate-700">{role}</b></p>
                    {linkedNurse ? (
                        <p className="text-[11px] text-teal-700 mt-1 bg-teal-50 px-2 py-1 rounded">
                            Linked Nurse: <b>{linkedNurse.name}</b> ({linkedNurse.tier} RN)
                        </p>
                    ) : (
                        <p className="text-[11px] text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">
                            No linked nurse record
                        </p>
                    )}
                </div>

                {activeMode && (
                    <div className="text-[11px] text-slate-500 mb-2 px-1">
                        Current View: <b className="capitalize text-slate-700">{activeMode}</b>
                    </div>
                )}

                <button
                    type="button"
                    className="w-full text-left rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={signOut}
                >
                    Sign out
                </button>
            </div>
        </details>
    );
}
