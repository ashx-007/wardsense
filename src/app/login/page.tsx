// src/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '../../lib/supabase/browser.ts';
import { ErrorNote } from '../../components/ui.tsx';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault(); setBusy(true); setError(null); setNotice(null);
        const sb = browserClient();
        try {
            if (mode === 'signup') {
                const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
                if (error) throw error;
                if (!data.session) { setNotice('Account created. Confirm your email, then sign in. New accounts default to the nurse role.'); setMode('signin'); return; }
            } else {
                const { error } = await sb.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
            router.replace('/dashboard'); router.refresh();
        } catch (err) { setError(err instanceof Error ? err.message : 'Authentication failed'); }
        finally { setBusy(false); }
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="card w-full max-w-md">
                <h1 className="text-xl font-semibold">Ward<span className="text-teal-600">Sense</span></h1>
                <p className="text-sm text-slate-500 mt-1 mb-5">Clinical workforce decision support — supervisor-approved allocations only.</p>
                <form onSubmit={submit} className="space-y-3">
                    {mode === 'signup' && (
                        <div><label className="label" htmlFor="name">Full name</label>
                            <input id="name" className="input" value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
                    )}
                    <div><label className="label" htmlFor="email">Email</label>
                        <input id="email" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></div>
                    <div><label className="label" htmlFor="pw">Password</label>
                        <input id="pw" type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></div>
                    <button className="btn-primary w-full" disabled={busy}>{busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
                </form>
                <ErrorNote error={error} />
                {notice && <p className="mt-2 text-sm text-teal-700">{notice}</p>}
                <button className="mt-4 text-sm text-blue-600 hover:underline" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
                    {mode === 'signin' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
                </button>
            </div>
        </main>
    );
}