'use client';

/**
 * Pricing KPI Grid Component
 *
 * Displays top-level metrics for dynamic pricing performance.
 * Shows active rules, coverage, average discount, and revenue impact.
 */

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Package,
  Percent,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { getPricingAnalytics } from '../actions';
import type { PricingAnalytics } from '@/types/dynamic-pricing';
import { cn } from '@/lib/utils';

export function PricingKPIGrid() {
  const { dispensaryId } = useDispensaryId();
  const [analytics, setAnalytics] = useState<PricingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!dispensaryId) {
      setIsLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await getPricingAnalytics(dispensaryId);
        setAnalytics(data);
      } catch (error) {
        console.error('[PricingKPIGrid] Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [dispensaryId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const { overview } = analytics;

  // Calculate trends (mock for now - would compare to previous period)
  const trends = {
    rules: { value: '+2', isPositive: true },
    coverage: { value: '+12%', isPositive: true },
    discount: { value: '-3%', isPositive: true }, // Lower discount is good
    revenue: { value: '+8%', isPositive: true },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Active Rules */}
      <KPICard
        title="Active Rules"
        value={analytics.rulePerformance.filter((r) => r.timesApplied > 0).length.toString()}
        subtitle={`of ${analytics.rulePerformance.length} total`}
        icon={Zap}
        iconColor="text-amber-500"
        iconBgColor="bg-amber-500/10"
        trend={trends.rules}
        tooltip="Number of pricing rules currently active and being applied"
      />

      {/* Products with Pricing */}
      <KPICard
        title="Products with Pricing"
        value={overview.productsWithDynamicPricing.toString()}
        subtitle={`${((overview.productsWithDynamicPricing / overview.totalProducts) * 100).toFixed(0)}% of catalog`}
        icon={Package}
        iconColor="text-blue-500"
        iconBgColor="bg-blue-500/10"
        trend={trends.coverage}
        tooltip="Products currently eligible for dynamic pricing"
      />

      {/* Average Discount */}
      <KPICard
        title="Avg Discount"
        value={`${overview.avgDiscountPercent.toFixed(1)}%`}
        subtitle="across all rules"
        icon={Percent}
        iconColor="text-green-500"
        iconBgColor="bg-green-500/10"
        trend={trends.discount}
        tooltip="Average discount percentage applied by active rules"
      />

      {/* Revenue Impact */}
      <KPICard
        title="Revenue Impact"
        value={formatCurrency(overview.revenueImpact)}
        subtitle="vs baseline"
        icon={DollarSign}
        iconColor={overview.revenueImpact >= 0 ? 'text-green-500' : 'text-red-500'}
        iconBgColor={overview.revenueImpact >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
        trend={trends.revenue}
        tooltip="Revenue change compared to baseline pricing (30-day period)"
        isRevenue
      />
    </div>
  );
}

// ============ KPI Card Component ============

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  trend?: { value: string; isPositive: boolean };
  tooltip: string;
  isRevenue?: boolean;
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
  tooltip,
  isRevenue = false,
}: KPICardProps) {
  return (
    <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <div className={cn('p-2 rounded-lg', iconBgColor)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              )}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {trend.value}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Helpers ============

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1000000) {
    return `${value >= 0 ? '+' : '-'}$${(absValue / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `${value >= 0 ? '+' : '-'}$${(absValue / 1000).toFixed(1)}K`;
  } else {
    return `${value >= 0 ? '+' : ''}$${value.toFixed(0)}`;
  }
}
