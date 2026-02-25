'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Lightbulb } from 'lucide-react';
import type { SuggestedGoal } from '@/types/goals';
import { getGoalCategoryInfo } from '@/types/goals';

interface SuggestedGoalCardProps {
  goal: SuggestedGoal;
  onAdopt: () => Promise<void>;
  isLoading?: boolean;
}

export function SuggestedGoalCard({ goal, onAdopt, isLoading = false }: SuggestedGoalCardProps) {
  const categoryInfo = getGoalCategoryInfo(goal.category);
  const timeframeLabel = {
    weekly: 'This Week',
    monthly: 'This Month',
    yearly: 'This Year',
  }[goal.timeframe];

  const iconComponent = categoryInfo && {
    foot_traffic: '🚶',
    revenue: '💰',
    retention: '❤️',
    loyalty: '⭐',
    marketing: '📢',
    compliance: '✅',
    margin: '📈',
    custom: '🎯',
  }[categoryInfo.id];

  return (
    <Card className="border-blue-200 bg-blue-50/50 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{iconComponent}</span>
              <CardTitle className="text-base">{goal.title}</CardTitle>
            </div>
            <CardDescription className="text-xs">
              {categoryInfo?.label} · {timeframeLabel}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            AI Suggested
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Target */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <div className="text-sm font-medium text-gray-700">Target</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {goal.targetMetric.targetValue} {goal.targetMetric.unit}
          </div>
        </div>

        {/* Rationale */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{goal.rationale}</p>
          </div>
        </div>

        {/* Suggested Playbooks */}
        {goal.suggestedPlaybookIds && goal.suggestedPlaybookIds.length > 0 && (
          <div className="text-xs text-gray-600 bg-white rounded-lg p-2 border border-blue-100">
            <p className="font-medium mb-1">Suggested playbooks:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {goal.suggestedPlaybookIds.map((id, idx) => (
                <li key={idx}>{id}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action */}
        <Button
          onClick={onAdopt}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isLoading ? 'Adopting...' : 'Adopt This Goal'}
        </Button>
      </CardContent>
    </Card>
  );
}
