// src/app/onboarding/page.tsx
// Server component wrapper for dynamic rendering

// Force dynamic rendering so middleware can intercept requests
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import OnboardingClient from './onboarding-client';

export default function OnboardingPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <OnboardingClient />
        </Suspense>
    );
}
