// src/components/layout/sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DashboardMode, Role } from '../../types/index.ts';
import { cx } from '../ui.tsx';
import { DashboardModeSwitcher } from './mode-switcher.tsx';

const NAV = [
    { href: '/dashboard', label: 'Overview', roles: ['nurse', 'supervisor', 'admin'], nurseVisible: true },
    { href: '/patients', label: 'Patient Roster', roles: ['supervisor', 'admin'], nurseVisible: false },
    { href: '/nurses', label: 'Nurse Management', roles: ['supervisor', 'admin'], nurseVisible: false },
    { href: '/allocation', label: 'Smart Allocation', roles: ['supervisor', 'admin'], nurseVisible: false },
    { href: '/shifts', label: 'Shift Management', roles: ['supervisor', 'admin'], nurseVisible: false },
    { href: '/alerts', label: 'Safety Alerts', roles: ['nurse', 'supervisor', 'admin'], nurseVisible: true },
    { href: '/analytics', label: 'Analytics', roles: ['supervisor', 'admin'], nurseVisible: false },
    { href: '/settings', label: 'Settings', roles: ['admin'], nurseVisible: false },
];

export function Sidebar({
    role,
    wardName,
    activeMode = 'supervisor',
    availableModes = ['supervisor'],
}: {
    role: Role;
    wardName: string;
    activeMode?: DashboardMode;
    availableModes?: DashboardMode[];
}) {
    const path = usePathname();

    // In Nurse presentation mode, show only nurse-relevant navigation items
    const visibleNav = NAV.filter(n => {
        if (!n.roles.includes(role)) return false;
        if (activeMode === 'nurse' && !n.nurseVisible) return false;
        return true;
    });

    return (
        <aside className="w-full lg:w-60 shrink-0 lg:min-h-screen bg-[#0f2540] text-slate-200 flex lg:flex-col">
            <div className="px-5 py-4 lg:py-6">
                <div className="text-lg font-semibold text-white">
                    Ward<span className="text-teal-400">Sense</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 hidden lg:block">{wardName}</div>
                {availableModes.length > 1 && (
                    <div className="mt-3 hidden lg:block">
                        <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
                            Dashboard Mode
                        </div>
                        <DashboardModeSwitcher
                            activeMode={activeMode}
                            availableModes={availableModes}
                            compact
                        />
                    </div>
                )}
            </div>

            <nav className="flex lg:flex-col gap-1 px-2 lg:px-3 pb-2 lg:pb-6 overflow-x-auto flex-1 items-center lg:items-stretch">
                {visibleNav.map(n => (
                    <Link
                        key={n.href}
                        href={n.href}
                        className={cx(
                            'rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors',
                            path === n.href || (n.href !== '/dashboard' && path.startsWith(n.href))
                                ? 'bg-teal-600/20 text-teal-300 font-medium'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white',
                        )}
                    >
                        {n.label}
                    </Link>
                ))}
            </nav>

            <div className="hidden lg:block px-5 pb-5">
                <div className="rounded-lg bg-white/5 p-2.5 text-[11px] text-slate-400 border border-white/5">
                    <p className="font-semibold text-slate-300">Hackathon Demo</p>
                    <p className="mt-0.5 leading-snug">
                        {activeMode === 'nurse'
                            ? 'Viewing personal nurse workload & patient assignments.'
                            : 'Supervisor perspective: allocation engine & ward management.'}
                    </p>
                </div>
            </div>
        </aside>
    );
}
