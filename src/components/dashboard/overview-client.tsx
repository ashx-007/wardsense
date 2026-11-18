// src/components/dashboard/overview-client.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ErrorNote } from '../ui.tsx';

export function RebalanceButton({ disabled }: { disabled: boolean }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
    async function go() {
        setBusy(true); setError(null);
        try {
            await api('/api/allocation/rebalance', 'POST'); // preview only — never auto-executes
            router.push('/allocation');
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setBusy(false); }
    }
    return (
        <div>
            <button className="btn-primary" onClick={go} disabled={disabled || busy}>{busy ? 'Generating preview…' : 'Smart rebalance → preview'}</button>
            <ErrorNote error={error} />
        </div>
    );
}