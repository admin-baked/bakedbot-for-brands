
'use client';

import { Suspense } from 'react';
import { OnboardingPageClient } from '@/onboarding/page-client';
import { Loader2 } from 'lucide-react';

function OnboardingLoading() {
    return (
        <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
    )
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<OnboardingLoading />}>
            <OnboardingPageClient />
        </Suspense>
    );
}
