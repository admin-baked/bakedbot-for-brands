'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, TrendingUp, Loader2, Target } from 'lucide-react';
import type { OrgGoal } from '@/types/goals';
import { GoalCard } from '@/components/dashboard/goals/goal-card';
import { GoalCreationDialog } from '@/components/dashboard/goals/goal-creation-dialog';
import {
  createGoal,
  getOrgGoals,
  updateGoalStatus,
  deleteGoal,
  achieveGoal,
} from '@/server/actions/goals';
import { logger } from '@/lib/logger';

const PLATFORM_ORG_ID = 'org_bakedbot_platform';

export default function GoalsCeoTab() {
  const [goals, setGoals] = useState<OrgGoal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Load goals on mount
  useEffect(() => {
    async function loadGoals() {
      try {
        const result = await getOrgGoals(PLATFORM_ORG_ID);
        if (result.success && result.goals) {
          setGoals(result.goals);
        }
      } catch (error: unknown) {
        logger.error('Error loading CEO goals:', error instanceof Error ? { message: error.message } : { error });
      } finally {
        setIsFetching(false);
      }
    }
    loadGoals();
  }, []);

  const handleCreateGoal = useCallback(
    async (goalData: Omit<OrgGoal, 'id' | 'createdAt' | 'updatedAt' | 'lastProgressUpdatedAt'>) => {
      setIsLoading(true);
      try {
        const result = await createGoal(PLATFORM_ORG_ID, {
          ...goalData,
          orgId: PLATFORM_ORG_ID,
          createdBy: '',
        });

        if (result.success && result.goalId) {
          const newGoal: OrgGoal = {
            id: result.goalId,
            ...goalData,
            orgId: PLATFORM_ORG_ID,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastProgressUpdatedAt: new Date(),
          };
          setGoals(prev => [newGoal, ...prev]);
          setDialogOpen(false);
        }
      } catch (error: unknown) {
        logger.error('Error creating CEO goal:', error instanceof Error ? { message: error.message } : { error });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleUpdateStatus = async (goalId: string, status: OrgGoal['status']) => {
    try {
      await updateGoalStatus(PLATFORM_ORG_ID, goalId, status);
      setGoals(goals.map(g => (g.id === goalId ? { ...g, status } : g)));
    } catch (error: unknown) {
      logger.error('Error updating goal status:', error instanceof Error ? { message: error.message } : { error });
    }
  };

  const handleAchieve = async (goalId: string) => {
    try {
      await achieveGoal(PLATFORM_ORG_ID, goalId);
      setGoals(goals.map(g => (g.id === goalId ? { ...g, status: 'achieved', progress: 100 } : g)));
    } catch (error: unknown) {
      logger.error('Error achieving goal:', error instanceof Error ? { message: error.message } : { error });
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      await deleteGoal(PLATFORM_ORG_ID, goalId);
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error: unknown) {
      logger.error('Error deleting goal:', error instanceof Error ? { message: error.message } : { error });
    }
  };

  const handlePause = async (goalId: string) => {
    await handleUpdateStatus(goalId, 'paused');
  };

  const handleResume = async (goalId: string) => {
    await handleUpdateStatus(goalId, 'active');
  };

  const grouped = {
    weekly: goals.filter(g => g.timeframe === 'weekly' && g.status !== 'archived'),
    monthly: goals.filter(g => g.timeframe === 'monthly' && g.status !== 'archived'),
    yearly: goals.filter(g => g.timeframe === 'yearly' && g.status !== 'archived'),
  };
  const archivedGoals = goals.filter(g => g.status === 'archived');

  if (isFetching) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const TabContent = ({ goals: tabGoals }: { goals: OrgGoal[] }) => {
    if (tabGoals.length === 0) {
      return (
        <div className="py-12">
          <EmptyState
            icon={TrendingUp}
            title="No goals in this timeframe"
            description="Create a new goal to get started"
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
            onActivate={goal.status === 'paused' ? () => handleResume(goal.id) : undefined}
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <Target className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">CEO Goals</h2>
              <p className="text-sm text-muted-foreground">
                GEO Action Plan — Get BakedBot AI into LLM responses
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Goal
        </Button>
      </div>

      {/* Goals Tabs */}
      {hasAnyGoals ? (
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
      ) : (
        <div className="py-12">
          <EmptyState
            icon={TrendingUp}
            title="No goals yet"
            description="Run the seed script or create your first goal to get started"
            action={
              <Button onClick={() => setDialogOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" /> Create Goal
              </Button>
            }
          />
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
      />
    </div>
  );
}
