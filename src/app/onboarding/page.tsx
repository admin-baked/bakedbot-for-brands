// src/app/onboarding/page.tsx
// Server component wrapper for authentication check

export const dynamic = 'force-dynamic';

import OnboardingClient from './onboarding-client';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';

export default async function OnboardingPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // 1. Server-side Auth Check
    // If no session, kick back to signin — preserve the ?plan= param so it
    // survives the auth round-trip via the ?next= mechanism in UnifiedLoginForm.
    try {
        await requireUser();
    } catch (e) {
        const params = await searchParams;
        const plan = typeof params.plan === 'string' ? params.plan : '';
        const nextPath = plan ? `/onboarding?plan=${encodeURIComponent(plan)}` : '/onboarding';
        redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
    }

    // 2. Render Client Logic
    // Valid user -> Let the client component determine if they need to complete steps
    // or if they should be forwarded to dashboard/claim.
    return (
        <div className="min-h-screen bg-muted/20">
            <OnboardingClient />
        </div>
    );
}
