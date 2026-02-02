'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Award, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import type { CustomerProfile } from '@/types/customers';

interface CustomerLoyaltyCardProps {
  customer: CustomerProfile;
  onSync?: () => Promise<void>;
  isLoading?: boolean;
}

export function CustomerLoyaltyCard({ customer, onSync, isLoading }: CustomerLoyaltyCardProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSync) return;

    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  // Determine tier color
  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'gold':
      case 'platinum':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'bronze':
      default:
        return 'bg-orange-100 text-orange-800 border-orange-300';
    }
  };

  // Format last sync time
  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';

    const now = new Date();
    const syncDate = new Date(date);
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Calculate discrepancy percentage
  const discrepancyPercent = customer.pointsFromAlpine && customer.pointsFromOrders
    ? Math.abs(customer.pointsFromAlpine - customer.pointsFromOrders) / customer.pointsFromAlpine * 100
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Loyalty Status</CardTitle>
          </div>
          {onSync && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-8"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
          )}
        </div>
        <CardDescription>
          Points and rewards tracking
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Points Display */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-bold text-purple-600">
              {customer.points?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Total Points
            </div>
          </div>

          <Badge
            variant="outline"
            className={`px-3 py-1 font-semibold ${getTierColor(customer.tier)}`}
          >
            {customer.tier?.toUpperCase() || 'BRONZE'}
          </Badge>
        </div>

        {/* Source Breakdown */}
        {(customer.pointsFromOrders !== undefined || customer.pointsFromAlpine !== undefined) && (
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Points Breakdown
            </div>

            {/* Calculated from Orders */}
            {customer.pointsFromOrders !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-muted-foreground">From Orders</span>
                </div>
                <span className="font-semibold">
                  {customer.pointsFromOrders.toLocaleString()}
                </span>
              </div>
            )}

            {/* Alpine IQ */}
            {customer.pointsFromAlpine !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span className="text-muted-foreground">Alpine IQ</span>
                  {customer.tierSource === 'alpine_iq' && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Source
                    </Badge>
                  )}
                </div>
                <span className="font-semibold">
                  {customer.pointsFromAlpine.toLocaleString()}
                </span>
              </div>
            )}

            {/* Discrepancy Warning */}
            {customer.loyaltyReconciled === false && customer.loyaltyDiscrepancy && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-900">
                      Discrepancy Detected
                    </div>
                    <div className="text-xs text-amber-700 mt-1">
                      Difference: {customer.loyaltyDiscrepancy} points ({discrepancyPercent.toFixed(1)}%)
                      {discrepancyPercent > 10 && ' - Needs review'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reconciled Status */}
            {customer.loyaltyReconciled === true && (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <span>Reconciled</span>
              </div>
            )}
          </div>
        )}

        {/* Last Sync Info */}
        {customer.pointsLastCalculated && (
          <div className="border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last synced {formatLastSync(customer.pointsLastCalculated)}</span>
          </div>
        )}

        {/* Alpine User ID (if available) */}
        {customer.alpineUserId && (
          <div className="text-xs text-muted-foreground">
            Alpine ID: <code className="bg-muted px-1 py-0.5 rounded">{customer.alpineUserId}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for CustomerLoyaltyCard
 */
export function CustomerLoyaltyCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <div>
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-20 mt-2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}
