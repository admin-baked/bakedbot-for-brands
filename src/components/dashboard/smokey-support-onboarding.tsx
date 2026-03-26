'use client';

import type { UserRole } from '@/types/roles';
import {
  Bot,
  ChevronLeft,
  Inbox,
  LifeBuoy,
  Megaphone,
  Rocket,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  SmokeySupportHelpSeed,
  SmokeySupportMission,
  SmokeySupportOnboardingGoalId,
  SmokeySupportOnboardingState,
} from '@/lib/dashboard/smokey-support-onboarding';
import {
  resolveSmokeySupportMission,
  selectSmokeySupportGoal,
  SMOKEY_SUPPORT_GOALS,
  startSmokeySupportOnboarding,
} from '@/lib/dashboard/smokey-support-onboarding';

interface SmokeySupportOnboardingProps {
  role: UserRole | null;
  state: SmokeySupportOnboardingState;
  onStateChange: (nextState: SmokeySupportOnboardingState) => void;
  onComplete: () => void;
  onSkip: () => void;
  onBrowseGuides: (seed: SmokeySupportHelpSeed) => void;
}

const GOAL_ICONS: Record<SmokeySupportOnboardingGoalId, typeof Rocket> = {
  launch: Rocket,
  attention: Inbox,
  campaign: Megaphone,
  agents: Bot,
  fix: Wrench,
};

function renderMissionSummary(mission: SmokeySupportMission) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Recommended next move</span>
      </div>
      <div className="space-y-1">
        <div className="font-semibold">{mission.title}</div>
        <p className="text-sm text-muted-foreground">{mission.description}</p>
        <div className="text-xs text-muted-foreground">Estimated time: {mission.estimatedTime}</div>
      </div>
    </div>
  );
}

export function SmokeySupportOnboarding({
  role,
  state,
  onStateChange,
  onComplete,
  onSkip,
  onBrowseGuides,
}: SmokeySupportOnboardingProps) {
  const mission = resolveSmokeySupportMission(role, state.selectedGoalId);

  if (state.currentStepId === 'welcome') {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Let's get you comfortable
          </CardTitle>
          <CardDescription>
            You do not need to learn the whole product at once. Inbox is where agent work shows up,
            Chat is where you ask for help, and Smokey Support is where you learn and get unstuck.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="rounded-xl border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <Inbox className="h-4 w-4 text-primary" />
                Inbox
              </div>
              <div className="text-sm text-muted-foreground">Where work and follow-ups show up</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <Bot className="h-4 w-4 text-primary" />
                Chat
              </div>
              <div className="text-sm text-muted-foreground">Where you ask agents for direct help</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <LifeBuoy className="h-4 w-4 text-primary" />
                Support
              </div>
              <div className="text-sm text-muted-foreground">Where you learn, search guides, and escalate</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => onStateChange(startSmokeySupportOnboarding(state))}>
              Start quick tour
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.currentStepId === 'goal') {
    return (
      <Card className="border-primary/20 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">What would feel most useful first?</CardTitle>
          <CardDescription>
            Pick the path that would make you feel confident fastest. We will pin a recommended
            first move for you when the tour finishes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {SMOKEY_SUPPORT_GOALS.map((goal) => {
              const Icon = GOAL_ICONS[goal.id];
              const isSelected = state.selectedGoalId === goal.id;

              return (
                <button
                  key={goal.id}
                  type="button"
                  className={cn(
                    'w-full rounded-xl border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:border-primary/40 hover:bg-muted/30',
                  )}
                  onClick={() => onStateChange({ ...state, selectedGoalId: goal.id })}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'mt-0.5 rounded-full p-2',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{goal.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{goal.description}</div>
                      <div className="mt-2 text-xs text-muted-foreground">About {goal.estimatedTime}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              disabled={!state.selectedGoalId}
              onClick={() => {
                if (!state.selectedGoalId) {
                  return;
                }

                onStateChange(selectSmokeySupportGoal(state, state.selectedGoalId));
              }}
            >
              Continue
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                onStateChange({
                  ...state,
                  status: 'in_progress',
                  currentStepId: 'welcome',
                })
              }
            >
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Your best first move</CardTitle>
        <CardDescription>
          When you finish, Smokey Support will take you to the normal help home and pin this as
          your recommended first action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mission ? (
          renderMissionSummary(mission)
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            We could not build a role-specific recommendation right now, but you can still jump into
            matching guides from here.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={onComplete}>Finish tour</Button>
          <Button
            variant="outline"
            onClick={() => onBrowseGuides(mission?.helpSeed ?? { query: 'quick start', category: 'getting-started' })}
          >
            See matching guides
          </Button>
          <Button
            variant="ghost"
            className="justify-start px-2"
            onClick={() =>
              onStateChange({
                ...state,
                status: 'in_progress',
                currentStepId: 'goal',
              })
            }
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SmokeySupportOnboarding;
