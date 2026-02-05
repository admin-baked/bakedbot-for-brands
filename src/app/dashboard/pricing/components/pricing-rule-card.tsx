'use client';

/**
 * Pricing Rule Card Component
 *
 * Individual card for managing a single dynamic pricing rule.
 * Features toggle, stats display, condition badges, and action menu.
 */

import { useState } from 'react';
import { togglePricingRule } from '@/app/actions/dynamic-pricing';
import type { DynamicPricingRule } from '@/types/dynamic-pricing';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  TrendingUp,
  Package,
  DollarSign,
  Percent,
  Zap,
  Clock,
  Users,
  MoreHorizontal,
  Edit,
  Copy,
  Archive,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Strategy icon and color mapping
const STRATEGY_CONFIG = {
  competitive: {
    icon: TrendingUp,
    label: 'Competitive',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    badgeColor: 'border-blue-500/30 text-blue-500',
  },
  clearance: {
    icon: Package,
    label: 'Clearance',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    badgeColor: 'border-red-500/30 text-red-500',
  },
  premium: {
    icon: DollarSign,
    label: 'Premium',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    badgeColor: 'border-purple-500/30 text-purple-500',
  },
  value: {
    icon: Percent,
    label: 'Value',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    badgeColor: 'border-green-500/30 text-green-500',
  },
  dynamic: {
    icon: Zap,
    label: 'Dynamic',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    badgeColor: 'border-amber-500/30 text-amber-500',
  },
};

interface PricingRuleCardProps {
  rule: DynamicPricingRule;
  onEdit?: (rule: DynamicPricingRule) => void;
  onDuplicate?: (rule: DynamicPricingRule) => void;
  onArchive?: (rule: DynamicPricingRule) => void;
}

export function PricingRuleCard({
  rule,
  onEdit,
  onDuplicate,
  onArchive,
}: PricingRuleCardProps) {
  const [isActive, setIsActive] = useState(rule.active);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const strategyConfig = STRATEGY_CONFIG[rule.strategy] || STRATEGY_CONFIG.dynamic;
  const StrategyIcon = strategyConfig.icon;

  // Handle toggle
  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const result = await togglePricingRule(rule.id, checked);

      if (result.success) {
        setIsActive(checked);
        toast({
          title: checked ? 'Rule Activated' : 'Rule Deactivated',
          description: `${rule.name} is now ${checked ? 'active' : 'inactive'}.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update rule.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update rule.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format discount display
  const discountDisplay = (() => {
    const { type, value } = rule.priceAdjustment;

    switch (type) {
      case 'percentage':
        return `${(value * 100).toFixed(0)}% OFF`;
      case 'fixed_amount':
        return `$${value.toFixed(2)} OFF`;
      case 'set_price':
        return `SET TO $${value.toFixed(2)}`;
      default:
        return 'DISCOUNT';
    }
  })();

  // Count conditions
  const conditionCount = Object.keys(rule.conditions).filter(
    (key) => rule.conditions[key as keyof typeof rule.conditions] !== undefined
  ).length;

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isActive ? 'border-primary/40' : 'opacity-70'
      )}
    >
      {/* Header with Toggle */}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Strategy Icon */}
            <div className={cn('p-2 rounded-lg', strategyConfig.bgColor)}>
              <StrategyIcon className={cn('h-5 w-5', strategyConfig.color)} />
            </div>

            {/* Rule Name & Strategy Badge */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{rule.name}</CardTitle>
              <Badge
                variant="outline"
                className={cn('mt-1 text-xs', strategyConfig.badgeColor)}
              >
                {strategyConfig.label}
              </Badge>
            </div>
          </div>

          {/* Toggle Switch */}
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={isLoading}
            className="shrink-0"
          />
        </div>
      </CardHeader>

      {/* Description & Stats */}
      <CardContent className="pb-3">
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
          {rule.description}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <div className="font-bold text-base">
              {rule.timesApplied?.toLocaleString() || 0}
            </div>
            <div className="text-muted-foreground">Applied</div>
          </div>
          <div>
            <div className="font-bold text-base">
              {rule.avgConversionRate ? `${rule.avgConversionRate.toFixed(1)}%` : '—'}
            </div>
            <div className="text-muted-foreground">Conv Rate</div>
          </div>
          <div>
            <div className="font-bold text-base">
              ${rule.revenueImpact ? rule.revenueImpact.toFixed(0) : '0'}
            </div>
            <div className="text-muted-foreground">Impact</div>
          </div>
        </div>

        {/* Condition Badges */}
        {conditionCount > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {rule.conditions.inventoryAge && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Age: {rule.conditions.inventoryAge.min}+ days
              </Badge>
            )}
            {rule.conditions.competitorPrice && (
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Competitor
              </Badge>
            )}
            {rule.conditions.timeRange && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Time-based
              </Badge>
            )}
            {rule.conditions.customerTier && rule.conditions.customerTier.length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {rule.conditions.customerTier.length} tier{rule.conditions.customerTier.length > 1 ? 's' : ''}
              </Badge>
            )}
            {rule.conditions.productIds && rule.conditions.productIds.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {rule.conditions.productIds.length} product{rule.conditions.productIds.length > 1 ? 's' : ''}
              </Badge>
            )}
            {rule.conditions.categories && rule.conditions.categories.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {rule.conditions.categories.length} categor{rule.conditions.categories.length > 1 ? 'ies' : 'y'}
              </Badge>
            )}
          </div>
        )}

        {/* Discount Badge (Prominent) */}
        <Badge
          variant="destructive"
          className="w-full justify-center py-2 font-bold"
        >
          {discountDisplay}
        </Badge>

        {/* Priority Indicator */}
        {rule.priority && rule.priority >= 75 && (
          <div className="mt-2 text-xs text-center text-muted-foreground">
            High Priority ({rule.priority})
          </div>
        )}
      </CardContent>

      {/* Actions Footer */}
      <CardFooter className="pt-3 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4 mr-2" />
              )}
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={() => onEdit?.(rule)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Rule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(rule)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onArchive?.(rule)}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
