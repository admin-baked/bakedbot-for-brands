import { logger } from '@/lib/logger';
import type { UserRole } from '@/types/roles';
import { isBrandRole, isDispensaryRole } from '@/types/roles';

export type SmokeySupportView = 'onboarding' | 'home' | 'help';
export type SmokeySupportBaseView = 'onboarding' | 'home';
export type SmokeySupportOnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type SmokeySupportOnboardingStepId = 'welcome' | 'goal' | 'mission';
export type SmokeySupportOnboardingGoalId = 'launch' | 'attention' | 'campaign' | 'agents' | 'fix';
export type SmokeySupportHelpCategory =
  | 'all'
  | 'getting-started'
  | 'products'
  | 'agents'
  | 'marketing'
  | 'analytics'
  | 'dispensary'
  | 'integrations'
  | 'troubleshooting';

export interface SmokeySupportHelpSeed {
  query: string;
  category: SmokeySupportHelpCategory;
}

export interface SmokeySupportOnboardingState {
  version: 1;
  status: SmokeySupportOnboardingStatus;
  currentStepId: SmokeySupportOnboardingStepId;
  selectedGoalId: SmokeySupportOnboardingGoalId | null;
  completedAt: string | null;
  skippedAt: string | null;
}

export interface SmokeySupportGoalDefinition {
  id: SmokeySupportOnboardingGoalId;
  title: string;
  description: string;
  estimatedTime: string;
  helpSeed: SmokeySupportHelpSeed;
}

export interface SmokeySupportMission {
  goalId: SmokeySupportOnboardingGoalId;
  title: string;
  description: string;
  estimatedTime: string;
  primaryActionLabel: string;
  primaryActionType: 'route' | 'help';
  primaryActionHref: string | null;
  helpSeed: SmokeySupportHelpSeed;
}

export const SMOKEY_SUPPORT_ONBOARDING_STORAGE_KEY = 'smokey-support-onboarding';
export const SMOKEY_SUPPORT_ONBOARDING_AUTO_OPEN_SESSION_KEY = 'smokey-support-onboarding-auto-opened';

const HELP_CATEGORIES: SmokeySupportHelpCategory[] = [
  'all',
  'getting-started',
  'products',
  'agents',
  'marketing',
  'analytics',
  'dispensary',
  'integrations',
  'troubleshooting',
];

const GOAL_IDS: SmokeySupportOnboardingGoalId[] = [
  'launch',
  'attention',
  'campaign',
  'agents',
  'fix',
];

const STEP_IDS: SmokeySupportOnboardingStepId[] = ['welcome', 'goal', 'mission'];
const STATUS_VALUES: SmokeySupportOnboardingStatus[] = ['not_started', 'in_progress', 'completed', 'skipped'];

export const SMOKEY_SUPPORT_GOALS: readonly SmokeySupportGoalDefinition[] = [
  {
    id: 'launch',
    title: 'Get live fast',
    description: 'Set up the first thing that gets your brand or store working in BakedBot.',
    estimatedTime: '2 min',
    helpSeed: { query: 'quick start', category: 'getting-started' },
  },
  {
    id: 'attention',
    title: 'See what needs attention',
    description: 'Learn where your team should start each day and where agent work shows up.',
    estimatedTime: '2 min',
    helpSeed: { query: 'inbox', category: 'getting-started' },
  },
  {
    id: 'campaign',
    title: 'Launch my first campaign',
    description: 'Understand where compliant campaign creation starts and what to review first.',
    estimatedTime: '3 min',
    helpSeed: { query: 'campaigns', category: 'marketing' },
  },
  {
    id: 'agents',
    title: 'Meet the AI agents',
    description: 'Learn who Smokey, Craig, Ezal, Pops, and Deebo are for before you ask them to work.',
    estimatedTime: '2 min',
    helpSeed: { query: 'ai agents', category: 'agents' },
  },
  {
    id: 'fix',
    title: 'Fix setup or data issues',
    description: 'Get pointed to troubleshooting help and support channels without guessing the right words.',
    estimatedTime: '2 min',
    helpSeed: { query: 'common issues', category: 'troubleshooting' },
  },
] as const;

export function getDefaultSmokeySupportOnboardingState(): SmokeySupportOnboardingState {
  return {
    version: 1,
    status: 'not_started',
    currentStepId: 'welcome',
    selectedGoalId: null,
    completedAt: null,
    skippedAt: null,
  };
}

function isHelpCategory(value: unknown): value is SmokeySupportHelpCategory {
  return typeof value === 'string' && HELP_CATEGORIES.includes(value as SmokeySupportHelpCategory);
}

function isGoalId(value: unknown): value is SmokeySupportOnboardingGoalId {
  return typeof value === 'string' && GOAL_IDS.includes(value as SmokeySupportOnboardingGoalId);
}

function isStepId(value: unknown): value is SmokeySupportOnboardingStepId {
  return typeof value === 'string' && STEP_IDS.includes(value as SmokeySupportOnboardingStepId);
}

function isStatus(value: unknown): value is SmokeySupportOnboardingStatus {
  return typeof value === 'string' && STATUS_VALUES.includes(value as SmokeySupportOnboardingStatus);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isOnboardingState(value: unknown): value is SmokeySupportOnboardingState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    state.version === 1
    && isStatus(state.status)
    && isStepId(state.currentStepId)
    && (state.selectedGoalId === null || isGoalId(state.selectedGoalId))
    && isNullableString(state.completedAt)
    && isNullableString(state.skippedAt)
  );
}

export function readSmokeySupportOnboardingState(
  storage: Pick<Storage, 'getItem'>,
): SmokeySupportOnboardingState {
  try {
    const rawState = storage.getItem(SMOKEY_SUPPORT_ONBOARDING_STORAGE_KEY);

    if (!rawState) {
      return getDefaultSmokeySupportOnboardingState();
    }

    const parsedState = JSON.parse(rawState);

    if (!isOnboardingState(parsedState)) {
      return getDefaultSmokeySupportOnboardingState();
    }

    return parsedState;
  } catch (error) {
    logger.warn('Failed to read Smokey support onboarding state', { error });
    return getDefaultSmokeySupportOnboardingState();
  }
}

export function writeSmokeySupportOnboardingState(
  storage: Pick<Storage, 'setItem'>,
  state: SmokeySupportOnboardingState,
): void {
  try {
    storage.setItem(SMOKEY_SUPPORT_ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.warn('Failed to write Smokey support onboarding state', { error, state });
  }
}

export function startSmokeySupportOnboarding(
  state: SmokeySupportOnboardingState,
): SmokeySupportOnboardingState {
  return {
    ...state,
    status: 'in_progress',
    currentStepId: 'goal',
    completedAt: null,
    skippedAt: null,
  };
}

export function selectSmokeySupportGoal(
  state: SmokeySupportOnboardingState,
  goalId: SmokeySupportOnboardingGoalId,
): SmokeySupportOnboardingState {
  return {
    ...state,
    status: 'in_progress',
    currentStepId: 'mission',
    selectedGoalId: goalId,
    completedAt: null,
    skippedAt: null,
  };
}

export function completeSmokeySupportOnboarding(
  state: SmokeySupportOnboardingState,
): SmokeySupportOnboardingState {
  return {
    ...state,
    status: 'completed',
    completedAt: new Date().toISOString(),
    skippedAt: null,
  };
}

export function skipSmokeySupportOnboarding(
  state: SmokeySupportOnboardingState,
): SmokeySupportOnboardingState {
  return {
    ...state,
    status: 'skipped',
    completedAt: null,
    skippedAt: new Date().toISOString(),
  };
}

export function resetSmokeySupportOnboarding(): SmokeySupportOnboardingState {
  return getDefaultSmokeySupportOnboardingState();
}

export function shouldShowSmokeySupportOnboarding(
  state: SmokeySupportOnboardingState,
): boolean {
  return state.status === 'not_started' || state.status === 'in_progress';
}

function getLaunchMission(role: UserRole | null): SmokeySupportMission | null {
  if (role && isBrandRole(role)) {
    return {
      goalId: 'launch',
      title: 'Import your products',
      description: 'Start by adding your catalog so the rest of the workspace has something real to work with.',
      estimatedTime: '5 min',
      primaryActionLabel: 'Open products',
      primaryActionType: 'route',
      primaryActionHref: '/dashboard/products',
      helpSeed: { query: 'brand quick start', category: 'getting-started' },
    };
  }

  if (role && isDispensaryRole(role)) {
    return {
      goalId: 'launch',
      title: 'Link your dispensary',
      description: 'Connect your location and menu source so BakedBot can guide the rest of setup with real data.',
      estimatedTime: '5 min',
      primaryActionLabel: 'Link dispensary',
      primaryActionType: 'route',
      primaryActionHref: '/dashboard/settings/link',
      helpSeed: { query: 'dispensary setup', category: 'getting-started' },
    };
  }

  return null;
}

export function resolveSmokeySupportMission(
  role: UserRole | null,
  goalId: SmokeySupportOnboardingGoalId | null,
): SmokeySupportMission | null {
  if (!goalId) {
    return null;
  }

  if (goalId === 'launch') {
    return getLaunchMission(role);
  }

  switch (goalId) {
    case 'attention':
      return {
        goalId,
        title: 'Open your inbox',
        description: 'Your inbox is mission control for threads, agent work, and what needs attention today.',
        estimatedTime: '3 min',
        primaryActionLabel: 'Open inbox',
        primaryActionType: 'route',
        primaryActionHref: '/dashboard/inbox',
        helpSeed: { query: 'inbox', category: 'getting-started' },
      };
    case 'campaign':
      return {
        goalId,
        title: 'Create your first campaign',
        description: 'Use the campaign workspace to draft marketing with compliance guardrails already in the loop.',
        estimatedTime: '5 min',
        primaryActionLabel: 'Open campaigns',
        primaryActionType: 'route',
        primaryActionHref: '/dashboard/marketing/campaigns/new',
        helpSeed: { query: 'campaigns', category: 'marketing' },
      };
    case 'agents':
      return {
        goalId,
        title: 'Meet the agent team in the inbox',
        description: 'Start in the inbox, then switch to chat when you want a direct back-and-forth with an agent.',
        estimatedTime: '3 min',
        primaryActionLabel: 'Open inbox',
        primaryActionType: 'route',
        primaryActionHref: '/dashboard/inbox',
        helpSeed: { query: 'ai agents', category: 'agents' },
      };
    case 'fix':
      return {
        goalId,
        title: 'Browse troubleshooting guides',
        description: 'Start with guided troubleshooting so you can self-serve common issues before escalating.',
        estimatedTime: '3 min',
        primaryActionLabel: 'Browse troubleshooting',
        primaryActionType: 'help',
        primaryActionHref: null,
        helpSeed: { query: 'common issues', category: 'troubleshooting' },
      };
    default:
      return null;
  }
}

export function isSmokeySupportHelpSeed(value: unknown): value is SmokeySupportHelpSeed {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const seed = value as Record<string, unknown>;

  return typeof seed.query === 'string' && isHelpCategory(seed.category);
}
