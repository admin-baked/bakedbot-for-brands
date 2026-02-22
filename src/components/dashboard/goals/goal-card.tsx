'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle,
  Target,
  Pause,
  Archive,
  Calendar,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { OrgGoal } from '@/types/goals';
import { getGoalStatusInfo, getGoalCategoryInfo } from '@/types/goals';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: OrgGoal;
  onActivate?: () => void;
  onAchieve?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export function GoalCard({
  goal,
  onActivate,
  onAchieve,
  onPause,
  onDelete,
  isLoading = false,
}: GoalCardProps) {
  const statusInfo = getGoalStatusInfo(goal.status);
  const categoryInfo = getGoalCategoryInfo(goal.category);

  const now = new Date();
  const daysRemaining = Math.floor((goal.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining <= 3 && daysRemaining > 0;

  // Get the primary metric to display
  const primaryMetric = goal.metrics[0];

  const statusIcon = {
    active: <Target className="h-4 w-4" />,
    achieved: <CheckCircle className="h-4 w-4" />,
    at_risk: <AlertCircle className="h-4 w-4" />,
    behind: <AlertCircle className="h-4 w-4" />,
    paused: <Pause className="h-4 w-4" />,
    archived: <Archive className="h-4 w-4" />,
  }[goal.status];

  return (
    <Card className={cn(
      'relative overflow-hidden',
      goal.status === 'achieved' && 'border-green-200 bg-green-50',
      goal.status === 'at_risk' && 'border-orange-200 bg-orange-50',
      goal.status === 'behind' && 'border-red-200 bg-red-50',
      goal.status === 'paused' && 'border-gray-200 bg-gray-50',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              {statusIcon && (
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-auto',
                    goal.status === 'active' && 'border-blue-200 bg-blue-50 text-blue-700',
                    goal.status === 'achieved' && 'border-green-200 bg-green-100 text-green-700',
                    goal.status === 'at_risk' && 'border-orange-200 bg-orange-100 text-orange-700',
                    goal.status === 'behind' && 'border-red-200 bg-red-100 text-red-700',
                    goal.status === 'paused' && 'border-gray-200 bg-gray-100 text-gray-700',
                  )}
                >
                  {statusIcon}
                  <span className="ml-1 text-xs font-medium">{statusInfo?.label}</span>
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm text-gray-600">
              {goal.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary Metric */}
        {primaryMetric && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{primaryMetric.label}</span>
              </div>
              <span className="text-sm font-semibold">
                {primaryMetric.currentValue} {primaryMetric.unit} / {primaryMetric.targetValue}{' '}
                {primaryMetric.unit}
              </span>
            </div>
            <Progress value={Math.min(100, (primaryMetric.currentValue / primaryMetric.targetValue) * 100)} className="h-2" />
          </div>
        )}

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Overall Progress</span>
            <span className="text-sm font-bold">{goal.progress}%</span>
          </div>
          <Progress
            value={goal.progress}
            className={cn(
              'h-3',
              goal.progress >= 100 && 'bg-green-100',
            )}
          />
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Calendar className="h-3.5 w-3.5" />
          {isOverdue ? (
            <span className="text-red-600 font-medium">Deadline passed ({Math.abs(daysRemaining)} days ago)</span>
          ) : isUrgent ? (
            <span className="text-orange-600 font-medium">{daysRemaining} days remaining</span>
          ) : (
            <span>{daysRemaining} days remaining</span>
          )}
        </div>

        {/* Suggested Playbooks */}
        {goal.suggestedPlaybookIds && goal.suggestedPlaybookIds.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              <Zap className="h-3 w-3 inline mr-1" />
              {goal.suggestedPlaybookIds.length} suggested playbook{goal.suggestedPlaybookIds.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 flex-wrap">
          {goal.status === 'active' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onAchieve}
                disabled={isLoading}
                className="text-xs"
              >
                Mark Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onPause}
                disabled={isLoading}
                className="text-xs"
              >
                Pause
              </Button>
            </>
          )}
          {goal.status === 'paused' && (
            <Button
              size="sm"
              variant="outline"
              onClick={onActivate}
              disabled={isLoading}
              className="text-xs"
            >
              Resume
            </Button>
          )}
          {goal.status !== 'archived' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              disabled={isLoading}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Archive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
