// src/app/onboarding/page.tsx
// Server component wrapper for dynamic rendering

// Force dynamic rendering so middleware can intercept requests
export const dynamic = 'force-dynamic';

import OnboardingClient from './onboarding-client';

export default function OnboardingPage() {
    return <OnboardingClient />;
}
