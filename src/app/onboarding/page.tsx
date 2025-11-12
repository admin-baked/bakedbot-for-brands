// server component: holds the segment config
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import OnboardingClient from './OnboardingClient';

export default function OnboardingPage() {
  return <OnboardingClient />;
}
