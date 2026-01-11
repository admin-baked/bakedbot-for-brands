// src/app/onboarding/page.tsx
// Server component wrapper for dynamic rendering

// Force dynamic rendering so middleware can intercept requests
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import OnboardingClient from './onboarding-client';

import { redirect } from 'next/navigation';

export default function OnboardingPage() {
    redirect('/claim');
}
