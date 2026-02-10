'use client';

/**
 * Inventory Intelligence Tab
 *
 * Displays inventory age data, expiring products, and clearance recommendations
 * powered by real Alleaves batch/inventory data.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  Package,
  Zap,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { useToast } from '@/hooks/use-toast';

interface InventoryRecommendation {
  productId: string;
  productName: string;
  urgency: 'low' | 'medium' | 'high';
  recommendedDiscount: number;
  reason: string;
  daysInInventory?: number;
  daysUntilExpiry?: number;
  stockLevel?: number;
}

interface InventoryStats {
  expiringSoon: number;
  slowMoving: number;
  recommendations: InventoryRecommendation[];
}

export function InventoryIntelligenceTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { dispensaryId } = useDispensaryId();
  const { toast } = useToast();

  const fetchInventoryData = async (showRefreshToast = false) => {
    if (!dispensaryId) return;

    try {
      if (showRefreshToast) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/inventory/intelligence?orgId=${dispensaryId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const data = await response.json();
      setStats(data);
      setError(null);

      if (showRefreshToast) {
        toast({
          title: 'Inventory Refreshed',
          description: `Found ${data.recommendations?.length || 0} clearance recommendations`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [dispensaryId]);

  const handleCreateRule = async (recommendation: InventoryRecommendation) => {
    toast({
      title: 'Creating Pricing Rule',
      description: `Setting up ${recommendation.recommendedDiscount}% discount for ${recommendation.productName}`,
    });

    // Navigate to create rule with pre-filled data
    const params = new URLSearchParams({
      create: 'pricing',
      productId: recommendation.productId,
      discount: recommendation.recommendedDiscount.toString(),
      strategy: 'clearance',
    });

    window.location.href = `/dashboard/inbox?${params.toString()}`;
  };

  const getUrgencyColor = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'low':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    }
  };

  const getUrgencyIcon = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <TrendingDown className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to Load Inventory Data</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchInventoryData()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const highUrgency = stats?.recommendations.filter((r) => r.urgency === 'high') || [];
  const mediumUrgency = stats?.recommendations.filter((r) => r.urgency === 'medium') || [];
  const lowUrgency = stats?.recommendations.filter((r) => r.urgency === 'low') || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats?.expiringSoon || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Products within 30 days of expiry</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              Slow Moving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats?.slowMoving || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Products 60+ days in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {stats?.recommendations.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Clearance pricing opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchInventoryData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Recommendations List */}
      {stats?.recommendations && stats.recommendations.length > 0 ? (
        <div className="space-y-4">
          {/* High Urgency */}
          {highUrgency.length > 0 && (
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  High Urgency ({highUrgency.length})
                </CardTitle>
                <CardDescription>
                  These products need immediate clearance pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {highUrgency.map((rec) => (
                    <RecommendationCard
                      key={rec.productId}
                      recommendation={rec}
                      onCreateRule={handleCreateRule}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medium Urgency */}
          {mediumUrgency.length > 0 && (
            <Card className="border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Medium Urgency ({mediumUrgency.length})
                </CardTitle>
                <CardDescription>
                  Consider clearance pricing within the next week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mediumUrgency.map((rec) => (
                    <RecommendationCard
                      key={rec.productId}
                      recommendation={rec}
                      onCreateRule={handleCreateRule}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Urgency */}
          {lowUrgency.length > 0 && (
            <Card className="border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-yellow-500" />
                  Low Urgency ({lowUrgency.length})
                </CardTitle>
                <CardDescription>
                  Monitor these products for future clearance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowUrgency.slice(0, 5).map((rec) => (
                    <RecommendationCard
                      key={rec.productId}
                      recommendation={rec}
                      onCreateRule={handleCreateRule}
                    />
                  ))}
                  {lowUrgency.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{lowUrgency.length - 5} more products
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Clearance Recommendations</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your inventory is healthy! No products currently need clearance pricing.
                Check back later as inventory ages.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onCreateRule,
}: {
  recommendation: InventoryRecommendation;
  onCreateRule: (rec: InventoryRecommendation) => void;
}) {
  const getUrgencyBadge = (urgency: 'low' | 'medium' | 'high') => {
    const colors = {
      high: 'bg-red-500/10 text-red-500 border-red-500/20',
      medium: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      low: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };
    return colors[urgency];
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{recommendation.productName}</span>
          <Badge variant="outline" className={cn('text-xs', getUrgencyBadge(recommendation.urgency))}>
            {recommendation.urgency.toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {recommendation.daysUntilExpiry !== undefined && (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Expires in {recommendation.daysUntilExpiry} days
            </span>
          )}
          {recommendation.daysInInventory !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {recommendation.daysInInventory} days old
            </span>
          )}
          {recommendation.stockLevel !== undefined && (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {recommendation.stockLevel} units
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <div className="text-right">
          <div className="text-lg font-bold text-emerald-500">
            {recommendation.recommendedDiscount}% OFF
          </div>
          <p className="text-xs text-muted-foreground">Recommended</p>
        </div>
        <Button size="sm" onClick={() => onCreateRule(recommendation)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Rule
        </Button>
      </div>
    </div>
  );
}
