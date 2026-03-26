import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    critical: jest.fn(),
  },
}));

import {
  completeSmokeySupportOnboarding,
  getDefaultSmokeySupportOnboardingState,
  readSmokeySupportOnboardingState,
  resolveSmokeySupportMission,
  selectSmokeySupportGoal,
  shouldShowSmokeySupportOnboarding,
  skipSmokeySupportOnboarding,
  startSmokeySupportOnboarding,
  writeSmokeySupportOnboardingState,
  SMOKEY_SUPPORT_ONBOARDING_STORAGE_KEY,
} from '@/lib/dashboard/smokey-support-onboarding';

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

function createStorage(initialValue?: string): Storage {
  const backingStore = new Map<string, string>();

  if (initialValue !== undefined) {
    backingStore.set(SMOKEY_SUPPORT_ONBOARDING_STORAGE_KEY, initialValue);
  }

  return {
    get length() {
      return backingStore.size;
    },
    clear() {
      backingStore.clear();
    },
    getItem(key: string) {
      return backingStore.has(key) ? backingStore.get(key)! : null;
    },
    key(index: number) {
      return Array.from(backingStore.keys())[index] ?? null;
    },
    removeItem(key: string) {
      backingStore.delete(key);
    },
    setItem(key: string, value: string) {
      backingStore.set(key, value);
    },
  };
}

describe('smokey support onboarding helpers', () => {
  it('returns the default state for invalid JSON', () => {
    const storage = createStorage('{broken-json');

    expect(readSmokeySupportOnboardingState(storage)).toEqual(
      getDefaultSmokeySupportOnboardingState(),
    );
  });

  it('moves from welcome to goal when the tour starts', () => {
    const nextState = startSmokeySupportOnboarding(
      getDefaultSmokeySupportOnboardingState(),
    );

    expect(nextState.status).toBe('in_progress');
    expect(nextState.currentStepId).toBe('goal');
    expect(shouldShowSmokeySupportOnboarding(nextState)).toBe(true);
  });

  it('moves from goal to mission and preserves the selected goal', () => {
    const startedState = startSmokeySupportOnboarding(
      getDefaultSmokeySupportOnboardingState(),
    );
    const nextState = selectSmokeySupportGoal(startedState, 'campaign');

    expect(nextState.status).toBe('in_progress');
    expect(nextState.currentStepId).toBe('mission');
    expect(nextState.selectedGoalId).toBe('campaign');
  });

  it('marks the tour completed with a timestamp', () => {
    const missionState = selectSmokeySupportGoal(
      startSmokeySupportOnboarding(getDefaultSmokeySupportOnboardingState()),
      'attention',
    );
    const completedState = completeSmokeySupportOnboarding(missionState);

    expect(completedState.status).toBe('completed');
    expect(completedState.completedAt).not.toBeNull();
    expect(shouldShowSmokeySupportOnboarding(completedState)).toBe(false);
  });

  it('marks the tour skipped with a timestamp', () => {
    const skippedState = skipSmokeySupportOnboarding(
      getDefaultSmokeySupportOnboardingState(),
    );

    expect(skippedState.status).toBe('skipped');
    expect(skippedState.skippedAt).not.toBeNull();
    expect(shouldShowSmokeySupportOnboarding(skippedState)).toBe(false);
  });

  it('writes and reads a valid state round-trip', () => {
    const storage = createStorage();
    const missionState = selectSmokeySupportGoal(
      startSmokeySupportOnboarding(getDefaultSmokeySupportOnboardingState()),
      'agents',
    );

    writeSmokeySupportOnboardingState(storage, missionState);

    expect(readSmokeySupportOnboardingState(storage)).toEqual(missionState);
  });

  it('maps brand launch to the products page', () => {
    const mission = resolveSmokeySupportMission('brand', 'launch');

    expect(mission).not.toBeNull();
    expect(mission?.primaryActionHref).toBe('/dashboard/products');
  });

  it('maps dispensary launch to the link page', () => {
    const mission = resolveSmokeySupportMission('dispensary', 'launch');

    expect(mission).not.toBeNull();
    expect(mission?.primaryActionHref).toBe('/dashboard/settings/link');
  });

  it('maps fix to a help action instead of a route', () => {
    const mission = resolveSmokeySupportMission('brand', 'fix');

    expect(mission).not.toBeNull();
    expect(mission?.primaryActionType).toBe('help');
    expect(mission?.primaryActionHref).toBeNull();
  });
});

afterAll(() => {
  consoleWarnSpy.mockRestore();
});
