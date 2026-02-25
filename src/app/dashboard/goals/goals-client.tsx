'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Sparkles, Plus, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import type { OrgGoal, SuggestedGoal } from '@/types/goals';
import { GoalCard } from '@/components/dashboard/goals/goal-card';
import { GoalCreationDialog } from '@/components/dashboard/goals/goal-creation-dialog';
import { SuggestedGoalCard } from '@/components/dashboard/goals/suggested-goal-card';
import {
  createGoal,
  updateGoalStatus,
  deleteGoal,
  achieveGoal,
} from '@/server/actions/goals';
import { logger } from '@/lib/logger';

interface GoalsClientProps {
  orgId: string;
  initialGoals: OrgGoal[];
}

export function GoalsClient({ orgId, initialGoals }: GoalsClientProps) {
  const [goals, setGoals] = useState<OrgGoal[]>(initialGoals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState<SuggestedGoal[]>([]);
  const [isSuggestingGoals, setIsSuggestingGoals] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const hasFetchedRef = useRef(false);

  const handleSuggestGoals = useCallback(async () => {
    setIsSuggestingGoals(true);
    try {
      const response = await fetch('/api/goals/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to get goal suggestions');
      }

      const data = await response.json();
      if (data.success && data.suggestions) {
        setSuggestedGoals(data.suggestions);
        setShowSuggestions(true);
        logger.info('Goal suggestions received', { count: data.suggestions.length });
      }
    } catch (error: unknown) {
      logger.error('Error suggesting goals:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    } finally {
      setIsSuggestingGoals(false);
    }
  }, []);

  // Auto-fetch suggestions on first mount when org has no goals yet
  useEffect(() => {
    if (initialGoals.length === 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      handleSuggestGoals();
    }
  }, [initialGoals.length, handleSuggestGoals]);

  const handleCreateGoal = useCallback(
    async (goalData: Omit<OrgGoal, 'id' | 'createdAt' | 'updatedAt' | 'lastProgressUpdatedAt'>) => {
      setIsLoading(true);
      try {
        const result = await createGoal(orgId, {
          ...goalData,
          orgId,
          createdBy: '', // Will be set in action
        });

        if (result.success && result.goalId) {
          const newGoal: OrgGoal = {
            id: result.goalId,
            ...goalData,
            orgId,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastProgressUpdatedAt: new Date(),
          };
          setGoals(prev => [newGoal, ...prev]);
          setDialogOpen(false);
          logger.info('Goal created successfully', { goalId: result.goalId });
        }
      } catch (error: unknown) {
        logger.error('Error creating goal:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
      } finally {
        setIsLoading(false);
      }
    },
    [orgId]
  );

  const handleUpdateStatus = async (goalId: string, status: OrgGoal['status']) => {
    try {
      await updateGoalStatus(orgId, goalId, status);
      setGoals(goals.map(g => (g.id === goalId ? { ...g, status } : g)));
    } catch (error: unknown) {
      logger.error('Error updating goal status:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }
  };

  const handleAchieve = async (goalId: string) => {
    try {
      await achieveGoal(orgId, goalId);
      setGoals(goals.map(g => (g.id === goalId ? { ...g, status: 'achieved', progress: 100 } : g)));
    } catch (error: unknown) {
      logger.error('Error marking goal as achieved:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await deleteGoal(orgId, goalId);
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error: unknown) {
      logger.error('Error deleting goal:', error instanceof Error ? { message: error.message, stack: error.stack } : { error });
    }
  };

  const handlePause = async (goalId: string) => {
    await handleUpdateStatus(goalId, 'paused');
  };

  const handleResume = async (goalId: string) => {
    await handleUpdateStatus(goalId, 'active');
  };

  const groupGoalsByTimeframe = (goals: OrgGoal[]) => {
    return {
      weekly: goals.filter(g => g.timeframe === 'weekly'),
      monthly: goals.filter(g => g.timeframe === 'monthly'),
      yearly: goals.filter(g => g.timeframe === 'yearly'),
    };
  };

  const grouped = groupGoalsByTimeframe(goals.filter(g => g.status !== 'archived'));
  const archivedGoals = goals.filter(g => g.status === 'archived');

  const TabContent = ({ goals: tabGoals }: { goals: OrgGoal[] }) => {
    if (tabGoals.length === 0) {
      return (
        <div className="py-12">
          <EmptyState
            icon={TrendingUp}
            title="No goals yet"
            description="Create your first goal to get started"
            action={
              <Button onClick={() => setDialogOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Create Goal
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        {tabGoals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onActivate={
              goal.status === 'paused' ? () => handleResume(goal.id) : undefined
            }
            onAchieve={goal.status === 'active' ? () => handleAchieve(goal.id) : undefined}
            onPause={goal.status === 'active' ? () => handlePause(goal.id) : undefined}
            onDelete={() => handleDelete(goal.id)}
            isLoading={isLoading}
          />
        ))}
      </div>
    );
  };

  const hasAnyGoals = goals.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-1">
            Set strategic goals to align your team
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Goal
        </Button>
      </div>

      {/* Proactive AI analysis — auto-loads on first visit with no goals */}
      {!hasAnyGoals && isSuggestingGoals && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-start gap-4">
          <Loader2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Analyzing your business data…</h3>
            <p className="text-sm text-blue-700">
              Reviewing customers, revenue, inventory, and margins to suggest goals that move the needle.
            </p>
          </div>
        </div>
      )}

      {/* AI-Recommended Goals — shown automatically or on refresh */}
      {showSuggestions && suggestedGoals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Recommended for Your Business
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Based on your customers, revenue, and inventory data
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSuggestions(false);
                setSuggestedGoals([]);
              }}
            >
              ✕ Dismiss
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedGoals.map((goal, idx) => (
              <SuggestedGoalCard
                key={idx}
                goal={goal}
                onAdopt={async () => {
                  await handleCreateGoal({
                    orgId,
                    createdBy: '', // Will be set in action
                    title: goal.title,
                    description: goal.description,
                    category: goal.category,
                    timeframe: goal.timeframe,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + {
                      weekly: 7,
                      monthly: 30,
                      yearly: 365,
                    }[goal.timeframe] * 24 * 60 * 60 * 1000),
                    status: 'active',
                    progress: 0,
                    metrics: [goal.targetMetric],
                    playbookIds: goal.suggestedPlaybookIds,
                    suggestedPlaybookIds: [],
                    milestones: [],
                  });
                  setShowSuggestions(false);
                  setSuggestedGoals([]);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Goals Tabs */}
      {hasAnyGoals && (
        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekly">
              Weekly
              {grouped.weekly.length > 0 && (
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  {grouped.weekly.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="monthly">
              Monthly
              {grouped.monthly.length > 0 && (
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  {grouped.monthly.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="yearly">
              Yearly
              {grouped.yearly.length > 0 && (
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  {grouped.yearly.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weekly">
            <TabContent goals={grouped.weekly} />
          </TabsContent>
          <TabsContent value="monthly">
            <TabContent goals={grouped.monthly} />
          </TabsContent>
          <TabsContent value="yearly">
            <TabContent goals={grouped.yearly} />
          </TabsContent>
        </Tabs>
      )}

      {/* Refresh recommendations when goals already exist */}
      {hasAnyGoals && !showSuggestions && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSuggestGoals}
            disabled={isSuggestingGoals}
            className="text-muted-foreground"
          >
            {isSuggestingGoals ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing data…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh AI Recommendations
              </>
            )}
          </Button>
        </div>
      )}

      {/* Archived Goals */}
      {archivedGoals.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Archived Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archivedGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onDelete={() => handleDelete(goal.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Goal Creation Dialog */}
      <GoalCreationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreateGoal={handleCreateGoal}
        isLoading={isLoading}
        orgId={orgId}
      />
    </div>
  );
}
