'use client';

/**
 * Smokey Floating Support Button
 *
 * Floating action button (FAB) that opens the Smokey support panel.
 * Features smart positioning to avoid blocking critical UI elements.
 * Help content is shown inline within the panel (no modal overlay).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X, ChevronLeft } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import { logger } from '@/lib/logger';
import type {
  SmokeySupportBaseView,
  SmokeySupportHelpSeed,
  SmokeySupportMission,
  SmokeySupportOnboardingState,
  SmokeySupportView,
} from '@/lib/dashboard/smokey-support-onboarding';
import {
  completeSmokeySupportOnboarding,
  getDefaultSmokeySupportOnboardingState,
  readSmokeySupportOnboardingState,
  resetSmokeySupportOnboarding,
  resolveSmokeySupportMission,
  shouldShowSmokeySupportOnboarding,
  skipSmokeySupportOnboarding,
  SMOKEY_SUPPORT_ONBOARDING_AUTO_OPEN_SESSION_KEY,
  writeSmokeySupportOnboardingState,
} from '@/lib/dashboard/smokey-support-onboarding';
import SmokeySupportPanel from './smokey-support-panel';
import SmokeySupportOnboarding from './smokey-support-onboarding';
import HelpSearchEnhanced from '@/components/help/help-search-enhanced';

// Keep Help Modal off routes with dense primary actions where the floating FAB can steal clicks.
const BLOCKED_ROUTES = ['/dashboard/menu', '/dashboard/settings', '/dashboard/creative'];

export function SmokeyFloatingButton() {
  const handledSupportActionRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SmokeySupportView>('home');
  const [lastNonHelpView, setLastNonHelpView] = useState<SmokeySupportBaseView>('home');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [helpSeed, setHelpSeed] = useState<SmokeySupportHelpSeed | null>(null);
  const [onboardingState, setOnboardingState] = useState<SmokeySupportOnboardingState>(
    getDefaultSmokeySupportOnboardingState(),
  );
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role } = useUserRole();
  const supportAction = searchParams.get('smokeySupport');
  const shouldShowOnboarding = shouldShowSmokeySupportOnboarding(onboardingState);
  const pinnedMission = onboardingState.status === 'completed'
    ? resolveSmokeySupportMission(role, onboardingState.selectedGoalId)
    : null;

  useEffect(() => {
    const hide = BLOCKED_ROUTES.some((route) => pathname.includes(route));
    setShouldHide(hide);
  }, [pathname]);

  useEffect(() => {
    const savedDismissedState = localStorage.getItem('smokey-support-dismissed');
    if (savedDismissedState === 'true') {
      setDismissed(true);
    }

    setOnboardingState(readSmokeySupportOnboardingState(localStorage));
    setHasHydrated(true);
  }, []);

  const persistOnboardingState = useCallback((nextState: SmokeySupportOnboardingState) => {
    setOnboardingState(nextState);
    writeSmokeySupportOnboardingState(localStorage, nextState);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !role) {
      return;
    }

    if (!supportAction) {
      handledSupportActionRef.current = null;
      return;
    }

    if (!['reset', 'onboarding'].includes(supportAction)) {
      return;
    }

    if (handledSupportActionRef.current === supportAction) {
      return;
    }

    handledSupportActionRef.current = supportAction;

    const nextState = resetSmokeySupportOnboarding();
    persistOnboardingState(nextState);
    setDismissed(false);
    localStorage.removeItem('smokey-support-dismissed');
    sessionStorage.setItem(SMOKEY_SUPPORT_ONBOARDING_AUTO_OPEN_SESSION_KEY, 'true');
    setHelpSeed(null);
    setOpen(true);
    setView('onboarding');
    setLastNonHelpView('onboarding');

    const nextSearchParams = new URLSearchParams(window.location.search);
    nextSearchParams.delete('smokeySupport');
    const nextQuery = nextSearchParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    window.history.replaceState(window.history.state, '', nextUrl);

    logger.info('smokey_support_onboarding_forced', {
      role,
      pathname,
      supportAction,
      source: 'query_param',
    });
  }, [hasHydrated, pathname, persistOnboardingState, role, supportAction]);

  useEffect(() => {
    if (!hasHydrated || !role || shouldHide || dismissed || !shouldShowOnboarding) {
      return;
    }

    if (sessionStorage.getItem(SMOKEY_SUPPORT_ONBOARDING_AUTO_OPEN_SESSION_KEY) === 'true') {
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
      setView('onboarding');
      setLastNonHelpView('onboarding');
      sessionStorage.setItem(SMOKEY_SUPPORT_ONBOARDING_AUTO_OPEN_SESSION_KEY, 'true');
      logger.info('smokey_support_onboarding_started', {
        role,
        pathname,
        onboardingStatus: onboardingState.status,
        selectedGoalId: onboardingState.selectedGoalId,
        source: 'auto_open',
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    dismissed,
    hasHydrated,
    onboardingState.selectedGoalId,
    onboardingState.status,
    pathname,
    role,
    shouldHide,
    shouldShowOnboarding,
  ]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('smokey-support-dismissed', 'true');
  }, []);

  const handleReopen = useCallback(() => {
    setDismissed(false);
    localStorage.setItem('smokey-support-dismissed', 'false');
  }, []);

  const handleHelpClick = useCallback((seed?: SmokeySupportHelpSeed) => {
    const sourceView: SmokeySupportBaseView = view === 'help' ? lastNonHelpView : view;
    setLastNonHelpView(sourceView);
    setHelpSeed(seed ?? null);
    setView('help');
    logger.info('smokey_support_help_seeded', {
      role,
      pathname,
      onboardingStatus: onboardingState.status,
      selectedGoalId: onboardingState.selectedGoalId,
      query: seed?.query ?? null,
      category: seed?.category ?? null,
      sourceView,
    });
  }, [lastNonHelpView, onboardingState.selectedGoalId, onboardingState.status, pathname, role, view]);

  const handleBackClick = useCallback(() => {
    setView(lastNonHelpView);
    setHelpSeed(null);
  }, [lastNonHelpView]);

  const handleOpen = useCallback(() => {
    const nextView: SmokeySupportBaseView = shouldShowOnboarding ? 'onboarding' : 'home';
    setOpen(true);
    setView(nextView);
    setLastNonHelpView(nextView);
  }, [shouldShowOnboarding]);

  const handleOnboardingStateChange = useCallback((nextState: SmokeySupportOnboardingState) => {
    if (
      onboardingState.currentStepId === 'welcome'
      && nextState.currentStepId === 'goal'
      && onboardingState.status === 'not_started'
    ) {
      logger.info('smokey_support_onboarding_started', {
        role,
        pathname,
        onboardingStatus: nextState.status,
        selectedGoalId: nextState.selectedGoalId,
        source: 'manual_start',
      });
    }

    if (
      nextState.currentStepId === 'mission'
      && nextState.selectedGoalId
      && nextState.selectedGoalId !== onboardingState.selectedGoalId
    ) {
      logger.info('smokey_support_onboarding_goal_selected', {
        role,
        pathname,
        onboardingStatus: nextState.status,
        selectedGoalId: nextState.selectedGoalId,
      });
    }

    persistOnboardingState(nextState);
  }, [onboardingState.currentStepId, onboardingState.selectedGoalId, onboardingState.status, pathname, persistOnboardingState, role]);

  const handleMissionAction = useCallback((mission: SmokeySupportMission) => {
    logger.info('smokey_support_mission_action_clicked', {
      role,
      pathname,
      onboardingStatus: onboardingState.status,
      selectedGoalId: onboardingState.selectedGoalId,
      goalId: mission.goalId,
      actionType: mission.primaryActionType,
      actionHref: mission.primaryActionHref,
      query: mission.helpSeed.query,
      category: mission.helpSeed.category,
      source: 'pinned_mission',
    });
  }, [onboardingState.selectedGoalId, onboardingState.status, pathname, role]);

  const handleOnboardingComplete = useCallback(() => {
    const nextState = completeSmokeySupportOnboarding(onboardingState);
    persistOnboardingState(nextState);
    setView('home');
    setLastNonHelpView('home');
    setHelpSeed(null);
    logger.info('smokey_support_onboarding_completed', {
      role,
      pathname,
      onboardingStatus: nextState.status,
      selectedGoalId: nextState.selectedGoalId,
    });
  }, [onboardingState, pathname, persistOnboardingState, role]);

  const handleOnboardingSkip = useCallback(() => {
    const nextState = skipSmokeySupportOnboarding(onboardingState);
    persistOnboardingState(nextState);
    setView('home');
    setLastNonHelpView('home');
    setHelpSeed(null);
    logger.info('smokey_support_onboarding_skipped', {
      role,
      pathname,
      onboardingStatus: nextState.status,
      selectedGoalId: nextState.selectedGoalId,
    });
  }, [onboardingState, pathname, persistOnboardingState, role]);

  const handleRestartTour = useCallback(() => {
    const nextState = resetSmokeySupportOnboarding();
    persistOnboardingState(nextState);
    setOpen(true);
    setView('onboarding');
    setLastNonHelpView('onboarding');
    setHelpSeed(null);
    logger.info('smokey_support_onboarding_restarted', {
      role,
      pathname,
      onboardingStatus: nextState.status,
      selectedGoalId: nextState.selectedGoalId,
    });
  }, [pathname, persistOnboardingState, role]);

  if (!hasHydrated || !role || !['brand', 'brand_admin', 'dispensary', 'dispensary_admin'].includes(role)) {
    return null;
  }

  if (shouldHide || dismissed) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 items-end z-50">
        {!open && !dismissed && (
          <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded opacity-75">
            {shouldShowOnboarding ? 'New here? Start your 2-minute tour ->' : 'Need help? Click the button ->'}
          </div>
        )}

        <Button
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          onClick={handleOpen}
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </div>

      {open && !dismissed && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-2rem)] max-w-[360px] shadow-2xl rounded-2xl border bg-background overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              {view === 'help' && (
                <button
                  onClick={handleBackClick}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold text-sm">
                  {view === 'onboarding'
                    ? 'Getting Started'
                    : view === 'home'
                      ? 'Smokey Support'
                      : 'Help Center'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                if (view === 'help') {
                  setHelpSeed(null);
                  setView(lastNonHelpView);
                }
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[60vh] p-4">
            {view === 'onboarding' ? (
              <SmokeySupportOnboarding
                role={role}
                state={onboardingState}
                onStateChange={handleOnboardingStateChange}
                onComplete={handleOnboardingComplete}
                onSkip={handleOnboardingSkip}
                onBrowseGuides={handleHelpClick}
              />
            ) : view === 'home' ? (
              <SmokeySupportPanel
                onHelpClick={handleHelpClick}
                pinnedMission={pinnedMission}
                onMissionAction={handleMissionAction}
              />
            ) : (
              <HelpSearchEnhanced
                userRole={role || undefined}
                initialQuery={helpSeed?.query ?? ''}
                initialCategory={helpSeed?.category ?? 'all'}
              />
            )}
          </div>

          {view === 'home' && (
            <div className="border-t px-4 py-3 bg-muted/20">
              {(onboardingState.status === 'completed' || onboardingState.status === 'skipped') && (
                <button
                  onClick={handleRestartTour}
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-2 px-2 rounded hover:bg-muted transition-colors"
                >
                  Take guided tour again
                </button>
              )}
              <button
                onClick={() => {
                  setOpen(false);
                  handleDismiss();
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 px-2 rounded hover:bg-muted transition-colors"
              >
                Dismiss this help button
              </button>
            </div>
          )}
        </div>
      )}

      {dismissed && (
        <button
          onClick={handleReopen}
          className="fixed bottom-6 right-6 z-50 text-xs text-muted-foreground hover:text-foreground"
          title="Reopen Smokey Support Hub"
        >
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors">
            <Sparkles className="h-3 w-3" />
            Help
          </span>
        </button>
      )}
    </>
  );
}

export default SmokeyFloatingButton;
