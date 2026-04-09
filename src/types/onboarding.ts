export type OnboardingPrimaryGoal =
  | 'checkin_tablet'
  | 'competitive_intelligence'
  | 'creative_center'
  | 'welcome_playbook';

export interface UserOnboardingProfile {
  version: string;
  primaryGoal?: OnboardingPrimaryGoal;
  selectedAt?: string;
  selectedCompetitorCount?: number;
}
