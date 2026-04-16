'use client';

/**
 * Firebase Auth Action Handler
 *
 * Handles Firebase auth email action links so they resolve at bakedbot.ai
 * instead of the Firebase project domain (studio-567050101-bc6e8.firebaseapp.com).
 *
 * Supported modes: resetPassword | verifyEmail | recoverEmail
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    confirmPasswordReset,
    applyActionCode,
    verifyPasswordResetCode,
} from 'firebase/auth';
import { auth } from '@/firebase/client';

const TRUSTED_CONTINUE_HOSTS = ['bakedbot.ai'];

/** Restrict continueUrl to relative paths or trusted domains to prevent open redirects. */
function safeContinueUrl(raw: string): string {
    try {
        const url = new URL(raw);
        if (TRUSTED_CONTINUE_HOSTS.includes(url.hostname)) return raw;
    } catch {
        // Not an absolute URL — must be a relative path
        if (raw.startsWith('/')) return raw;
    }
    return '/dashboard';
}

type ActionMode = 'resetPassword' | 'verifyEmail' | 'recoverEmail' | null;
type PageState = 'loading' | 'form' | 'success' | 'error';

function AuthActionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const mode = searchParams.get('mode') as ActionMode;
    const oobCode = searchParams.get('oobCode') ?? '';
    const continueUrl = safeContinueUrl(searchParams.get('continueUrl') ?? '/dashboard');

    const [pageState, setPageState] = useState<PageState>('loading');
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Guard against double-invoke (React Strict Mode dev, Suspense hydration flush)
    const hasRun = useRef(false);

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        if (!oobCode || !mode) {
            setError('Invalid or missing action code. Please request a new link.');
            setPageState('error');
            return;
        }

        let timeoutId: ReturnType<typeof setTimeout>;

        async function init() {
            try {
                if (mode === 'resetPassword') {
                    const userEmail = await verifyPasswordResetCode(auth, oobCode);
                    setEmail(userEmail);
                    setPageState('form');
                } else if (mode === 'verifyEmail' || mode === 'recoverEmail') {
                    await applyActionCode(auth, oobCode);
                    setPageState('success');
                    timeoutId = setTimeout(() => router.push(continueUrl), 2500);
                } else {
                    setError('Unrecognized action. Please request a new link.');
                    setPageState('error');
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('expired') || msg.includes('invalid')) {
                    setError('This link has expired or already been used. Please request a new one.');
                } else {
                    setError('Something went wrong. Please try again.');
                }
                setPageState('error');
            }
        }

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        return () => clearTimeout(timeoutId);
    }, [mode, oobCode, continueUrl]); // router excluded — router.push is a stable imperative API

    async function handlePasswordReset(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            await confirmPasswordReset(auth, oobCode, password);
            setPageState('success');
            setTimeout(() => router.push(continueUrl), 2500);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('expired') || msg.includes('invalid')) {
                setError('This link has expired. Please request a new password reset.');
            } else if (msg.includes('weak-password')) {
                setError('Password is too weak. Please choose a stronger password.');
            } else {
                setError('Failed to reset password. Please try again.');
            }
            setSubmitting(false);
        }
    }

    const modeLabel: Record<NonNullable<ActionMode>, string> = {
        resetPassword: 'Reset Your Password',
        verifyEmail: 'Email Verification',
        recoverEmail: 'Email Recovery',
    };

    const successMessage: Record<NonNullable<ActionMode>, string> = {
        resetPassword: 'Password updated! Redirecting you now…',
        verifyEmail: 'Email verified! Redirecting you now…',
        recoverEmail: 'Email recovered! Redirecting you now…',
    };

    const heading = mode ? modeLabel[mode] : 'BakedBot';

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl p-8 space-y-6">
                {/* Logo / Brand */}
                <div className="text-center">
                    <span className="text-2xl font-bold text-white">BakedBot</span>
                    <p className="mt-1 text-sm text-gray-400">{heading}</p>
                </div>

                {pageState === 'loading' && (
                    <div className="text-center text-gray-400 py-8 text-sm animate-pulse">
                        Verifying your link…
                    </div>
                )}

                {pageState === 'error' && (
                    <div className="space-y-4 text-center">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}

                {pageState === 'form' && mode === 'resetPassword' && (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        {email && (
                            <p className="text-sm text-gray-400 text-center">
                                Setting a new password for <span className="text-gray-200">{email}</span>
                            </p>
                        )}
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your new password"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                        >
                            {submitting ? 'Saving…' : 'Set New Password'}
                        </button>
                    </form>
                )}

                {pageState === 'success' && mode && (
                    <div className="text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-green-400 text-sm">{successMessage[mode]}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AuthActionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
            </div>
        }>
            <AuthActionContent />
        </Suspense>
    );
}
