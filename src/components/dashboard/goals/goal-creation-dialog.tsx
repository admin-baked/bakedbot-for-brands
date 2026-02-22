'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  DollarSign,
  Heart,
  Star,
  Megaphone,
  ShieldCheck,
  Target,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { OrgGoal, GoalCategory, GoalTimeframe } from '@/types/goals';
import { GOAL_CATEGORIES } from '@/types/goals';
import { cn } from '@/lib/utils';

interface GoalCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGoal: (goal: Omit<OrgGoal, 'id' | 'createdAt' | 'updatedAt' | 'lastProgressUpdatedAt'>) => Promise<void>;
  isLoading?: boolean;
  suggestedGoals?: any[]; // From magic button
}

type Step = 'category' | 'details' | 'playbooks';

const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  weekly: 'This Week',
  monthly: 'This Month',
  yearly: 'This Year',
};

const TIMEFRAME_DURATION: Record<GoalTimeframe, number> = {
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

export function GoalCreationDialog({
  open,
  onOpenChange,
  onCreateGoal,
  isLoading = false,
  suggestedGoals = [],
}: GoalCreationDialogProps) {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [timeframe, setTimeframe] = useState<GoalTimeframe>('weekly');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [selectedPlaybooks, setSelectedPlaybooks] = useState<string[]>([]);

  const categoryInfo = GOAL_CATEGORIES.find(c => c.id === category);

  const handleReset = () => {
    setStep('category');
    setCategory(null);
    setTimeframe('weekly');
    setTitle('');
    setDescription('');
    setTargetValue('');
    setSelectedPlaybooks([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(handleReset, 300); // Reset after dialog closes
  };

  const handleCreate = async () => {
    if (!category || !title || !targetValue) {
      return;
    }

    const now = new Date();
    const durationDays = TIMEFRAME_DURATION[timeframe];
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create goal with placeholder metric
    const goal: Omit<OrgGoal, 'id' | 'createdAt' | 'updatedAt' | 'lastProgressUpdatedAt'> = {
      orgId: '', // Will be set by the page component
      createdBy: '', // Will be set by the page component
      title,
      description,
      category,
      timeframe,
      startDate: now,
      endDate,
      status: 'active',
      progress: 0,
      metrics: [
        {
          key: 'primary',
          label: title,
          targetValue: parseFloat(targetValue) || 0,
          currentValue: 0,
          baselineValue: 0,
          unit: getUnitForCategory(category),
          direction: 'increase',
        },
      ],
      playbookIds: selectedPlaybooks,
      suggestedPlaybookIds: [],
      milestones: [],
    };

    await onCreateGoal(goal);
    handleClose();
  };

  const getUnitForCategory = (cat: GoalCategory): string => {
    switch (cat) {
      case 'revenue':
        return '$';
      case 'foot_traffic':
      case 'loyalty':
        return '#';
      case 'retention':
      case 'marketing':
        return '%';
      default:
        return '#';
    }
  };

  const categoryIcon: Record<GoalCategory, React.ReactNode> = {
    foot_traffic: <MapPin className="h-8 w-8" />,
    revenue: <DollarSign className="h-8 w-8" />,
    retention: <Heart className="h-8 w-8" />,
    loyalty: <Star className="h-8 w-8" />,
    marketing: <Megaphone className="h-8 w-8" />,
    compliance: <ShieldCheck className="h-8 w-8" />,
    custom: <Target className="h-8 w-8" />,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        {step === 'category' && (
          <>
            <DialogHeader>
              <DialogTitle>Create a Goal</DialogTitle>
              <DialogDescription>
                What would you like to focus on?
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto py-4">
              {GOAL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setTimeframe(cat.defaultTimeframe);
                  }}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    category === cat.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="text-gray-600">{categoryIcon[cat.id]}</div>
                    <span className="font-semibold text-sm">{cat.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{cat.description}</p>
                </button>
              ))}
            </div>

            {category && (
              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Timeframe</Label>
                <RadioGroup value={timeframe} onValueChange={v => setTimeframe(v as GoalTimeframe)}>
                  <div className="flex gap-4 mt-2">
                    {(['weekly', 'monthly', 'yearly'] as const).map(tf => (
                      <div key={tf} className="flex items-center space-x-2">
                        <RadioGroupItem value={tf} id={tf} />
                        <Label htmlFor={tf} className="font-normal cursor-pointer">
                          {TIMEFRAME_LABELS[tf]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('details')}
                disabled={!category}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'details' && category && (
          <>
            <DialogHeader>
              <DialogTitle>Goal Details</DialogTitle>
              <DialogDescription>
                Define your {TIMEFRAME_LABELS[timeframe].toLowerCase()} {categoryInfo?.label.toLowerCase()} goal
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="title">Goal Title</Label>
                <Input
                  id="title"
                  placeholder={categoryInfo?.exampleGoals[0]}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1"
                />
                {categoryInfo?.exampleGoals && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Examples:</p>
                    <div className="flex flex-wrap gap-1">
                      {categoryInfo.exampleGoals.map((example, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant="ghost"
                          onClick={() => setTitle(example)}
                          className="text-xs h-auto py-1 px-2"
                        >
                          {example}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Why is this goal important? How will you achieve it?"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="mt-1 min-h-24"
                />
              </div>

              <div>
                <Label htmlFor="target">Target Value</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="target"
                    type="number"
                    placeholder="e.g., 50"
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                  />
                  <div className="flex items-center px-3 bg-gray-100 rounded-md text-sm font-medium">
                    {getUnitForCategory(category)}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('category')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep('playbooks')}
                disabled={!title || !targetValue}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'playbooks' && category && (
          <>
            <DialogHeader>
              <DialogTitle>Playbooks (Optional)</DialogTitle>
              <DialogDescription>
                Select playbooks to activate for this goal
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  💡 <strong>Tip:</strong> Playbooks automate actions to help you reach your goal. You can add them now or
                  later.
                </p>
              </div>

              {suggestedGoals && suggestedGoals.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Suggested for your goal:</p>
                  {/* TODO: Display suggested playbooks from magic button */}
                  <p className="text-xs text-muted-foreground">
                    No playbook suggestions available yet
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-600 text-center">
                    No playbook recommendations yet
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('details')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isLoading || !title || !targetValue}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating...
                  </>
                ) : (
                  'Create Goal'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
