import type { OnboardingPrimaryGoal } from '@/types/onboarding';
import type { UserRole } from '@/types/roles';
import { isBrandRole, isDispensaryRole, isGrowerRole } from '@/types/roles';

export const ONBOARDING_PHASE1_VERSION = '2026-04-onboarding-phase1';

export interface OnboardingGoalDefinition {
  id: OnboardingPrimaryGoal;
  title: string;
  description: string;
  audienceLabel: string;
  ctaLabel: string;
}

export const ONBOARDING_PRIMARY_GOALS: readonly OnboardingGoalDefinition[] = [
  {
    id: 'checkin_tablet',
    title: 'Check In with Tablet',
    description: 'Launch the front-door check-in flow, staff training, and live QR experience.',
    audienceLabel: 'Best for dispensary teams',
    ctaLabel: 'Open Check-In Manager',
  },
  {
    id: 'creative_center',
    title: 'Creative Center',
    description: 'Create social content faster and get your calendar moving with brand-aware AI.',
    audienceLabel: 'Best for marketers, brands, and retail promo teams',
    ctaLabel: 'Open Creative Center',
  },
  {
    id: 'welcome_playbook',
    title: 'Email Personalization',
    description: 'Turn on the Welcome Playbook so new contacts get personalized follow-up automatically.',
    audienceLabel: 'Best for retention, CRM, and lifecycle setup',
    ctaLabel: 'Open Playbooks',
  },
] as const;

export function isOnboardingPrimaryGoal(value: unknown): value is OnboardingPrimaryGoal {
  return ONBOARDING_PRIMARY_GOALS.some((goal) => goal.id === value);
}

export function normalizeOnboardingPrimaryGoal(value: unknown): OnboardingPrimaryGoal | null {
  return isOnboardingPrimaryGoal(value) ? value : null;
}

export function getDefaultOnboardingPrimaryGoal(role: UserRole | 'skip' | null | undefined): OnboardingPrimaryGoal {
  if (!role || role === 'skip') {
    return 'welcome_playbook';
  }

  if (isDispensaryRole(role)) {
    return 'checkin_tablet';
  }

  if (isBrandRole(role) || isGrowerRole(role)) {
    return 'creative_center';
  }

  return 'welcome_playbook';
}

export function getOnboardingGoalDefinition(goal: OnboardingPrimaryGoal): OnboardingGoalDefinition {
  return ONBOARDING_PRIMARY_GOALS.find((candidate) => candidate.id === goal) ?? ONBOARDING_PRIMARY_GOALS[0];
}

export function getOnboardingGoalHref(
  goal: OnboardingPrimaryGoal,
  role: UserRole | null | undefined,
): string {
  const normalizedRole = role ?? null;

  switch (goal) {
    case 'checkin_tablet':
      return isDispensaryRole(normalizedRole) ? '/dashboard/dispensary/checkin' : '/dashboard/playbooks';
    case 'creative_center':
      return '/dashboard/creative';
    case 'welcome_playbook':
    default:
      return '/dashboard/playbooks';
  }
}

export function getOnboardingGoalPreview(
  goal: OnboardingPrimaryGoal,
  role: UserRole | null | undefined,
): string {
  const normalizedRole = role ?? null;

  switch (goal) {
    case 'checkin_tablet':
      return isDispensaryRole(normalizedRole)
        ? 'Configure the live check-in flow first, then print the QR and train the front-door staff.'
        : 'Retail teams usually pair this with a Welcome Playbook once the store-side experience is live.';
    case 'creative_center':
      return 'Start with Brand Guide, create a first draft, then place one item on the calendar.';
    case 'welcome_playbook':
    default:
      return 'Connect email, review the welcome automation, and make sure the first send is ready to go.';
  }
}
