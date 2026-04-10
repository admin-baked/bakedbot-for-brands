export type OnboardingPrimaryGoal =
  | 'checkin_tablet'
  | 'competitive_intelligence'
  | 'creative_center'
  | 'welcome_playbook';

export type OnboardingStepId =
  | 'brand-guide'
  | 'link-dispensary'
  | 'connect-pos'
  | 'checkin-manager'
  | 'qr-training'
  | 'creative-center'
  | 'content-calendar'
  | 'welcome-playbook'
  | 'inbox-foundations'
  | 'competitive-intel';

export interface UserOnboardingProfile {
  version: string;
  primaryGoal?: OnboardingPrimaryGoal;
  selectedAt?: string;
  selectedCompetitorCount?: number;
  /** Server-persisted step completion — survives logout and device switches */
  completedSteps?: OnboardingStepId[];
  /** ISO timestamp of last step completion */
  lastStepCompletedAt?: string;
}
