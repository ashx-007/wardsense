// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation';
import { serverClient } from '../../lib/supabase/server.ts';
import { getSession } from '../../lib/auth/session.ts';
import { getWard } from '../../server/repositories/ward.repository.ts';
import { Sidebar } from '../../components/layout/sidebar.tsx';
import { ProfileMenu } from '../../components/layout/profile-menu.tsx';
import { RealtimeProvider } from '../../components/layout/realtime.tsx';
import { DashboardModeSwitcher } from '../../components/layout/mode-switcher.tsx';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const sb = await serverClient();
    const session = await getSession(sb);
    if (!session.user || !session.role) redirect('/login');
    const { ward } = await getWard(sb);

    return (
        <RealtimeProvider wardId={ward.id}>
            <div className="flex flex-col lg:flex-row min-h-screen">
                <Sidebar
                    role={session.role}
                    wardName={ward.name}
                    activeMode={session.activeMode}
                    availableModes={session.availableModes}
                />
                <div className="flex-1 min-w-0">
                    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-slate-700">{ward.name}</div>
                            {session.availableModes.length > 1 && (
                                <div className="hidden sm:block">
                                    <DashboardModeSwitcher
                                        activeMode={session.activeMode}
                                        availableModes={session.availableModes}
                                        compact
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {session.availableModes.length > 1 && (
                                <div className="sm:hidden">
                                    <DashboardModeSwitcher
                                        activeMode={session.activeMode}
                                        availableModes={session.availableModes}
                                        compact
                                    />
                                </div>
                            )}
                            <ProfileMenu
                                name={session.profile?.full_name || session.user.email || 'User'}
                                role={session.role}
                                linkedNurse={session.linkedNurse}
                                activeMode={session.activeMode}
                            />
                        </div>
                    </header>
                    <main className="p-4 sm:p-6 max-w-7xl mx-auto">{children}</main>
                </div>
            </div>
        </RealtimeProvider>
    );
}
