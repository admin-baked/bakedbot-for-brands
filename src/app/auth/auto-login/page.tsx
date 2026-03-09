'use client';

/**
 * Auto-Login Page
 *
 * Automatically signs in users with a custom token from the URL.
 * Used for super user quick access.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';

import { auth } from '@/firebase/client';

function AutoLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('No authentication token provided');
      return;
    }

    async function authenticate(authToken: string) {
      try {
        setStatus('loading');

        const userCredential = await signInWithCustomToken(auth, authToken);
        console.log('Auto-login successful:', userCredential.user.email);

        setStatus('success');

        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } catch (cause: any) {
        console.error('Auto-login failed:', cause);
        setStatus('error');
        setError(cause.message || 'Authentication failed');
      }
    }

    authenticate(token);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="mx-4 w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-purple-600">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Super User Login</h1>
          </div>

          {status === 'loading' && (
            <div className="py-8 text-center">
              <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
              <p className="text-gray-600">Authenticating...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">Login Successful!</h2>
              <p className="mb-4 text-gray-600">Redirecting to dashboard...</p>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 w-full animate-pulse rounded-full bg-purple-600" />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">Authentication Failed</h2>
              <p className="mb-6 text-gray-600">{error}</p>
              <button
                onClick={() => router.push('/auth/signin')}
                className="rounded-lg bg-purple-600 px-6 py-2 text-white transition-colors hover:bg-purple-700"
              >
                Go to Sign In
              </button>
            </div>
          )}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex items-start gap-3 text-sm text-gray-500">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p>This is a secure super user login. Never share your login token with anyone.</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-purple-200">BakedBot Copyright 2026 - Agentic Commerce OS</p>
      </div>
    </div>
  );
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={null}>
      <AutoLoginPageContent />
    </Suspense>
  );
}
