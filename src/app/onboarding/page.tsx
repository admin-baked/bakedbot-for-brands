// src/app/onboarding/page.tsx
// Server component wrapper for dynamic rendering

// Force dynamic rendering so middleware can intercept requests
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import OnboardingClient from './onboarding-client';

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
            <OnboardingClient />
        </Suspense>
    );
}
