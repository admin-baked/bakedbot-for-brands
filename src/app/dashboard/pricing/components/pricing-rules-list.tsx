'use client';

/**
 * Pricing Rules List Component
 *
 * Displays all pricing rules with real-time updates from Firestore.
 * Uses useCollection hook for automatic synchronization.
 */

import { useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import { PricingRuleCard } from './pricing-rule-card';
import { pricingRuleConverter } from '@/firebase/converters';
import type { DynamicPricingRule } from '@/types/dynamic-pricing';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PricingRulesListProps {
  onCreateRule?: () => void;
  onEditRule?: (rule: DynamicPricingRule) => void;
}

export function PricingRulesList({
  onCreateRule,
  onEditRule,
}: PricingRulesListProps) {
  const { dispensaryId } = useDispensaryId();
  const { firestore } = useFirebase();
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  // Query pricing rules with real-time updates
  const rulesQuery =
    firestore && dispensaryId
      ? query(
          collection(firestore, 'pricingRules'),
          where('orgId', '==', dispensaryId),
          orderBy('priority', 'desc')
        ).withConverter(pricingRuleConverter)
      : null;

  const { data: rules, isLoading, error } = useCollection<DynamicPricingRule>(rulesQuery);

  // Filter by strategy if selected
  const filteredRules = selectedStrategy
    ? rules?.filter((rule) => rule.strategy === selectedStrategy)
    : rules;

  // Handle rule actions
  const handleEdit = (rule: DynamicPricingRule) => {
    onEditRule?.(rule);
  };

  const handleDuplicate = (rule: DynamicPricingRule) => {
    // TODO: Implement duplicate logic
    console.log('Duplicate rule:', rule.id);
  };

  const handleArchive = (rule: DynamicPricingRule) => {
    // TODO: Implement archive logic
    console.log('Archive rule:', rule.id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-destructive text-center">
          <p className="font-semibold mb-2">Failed to load pricing rules</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!rules || rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Pricing Rules Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Get started by creating your first dynamic pricing rule. Use AI to suggest
          optimal strategies or build custom rules from scratch.
        </p>
        <Button onClick={onCreateRule} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Create Your First Rule
        </Button>
      </div>
    );
  }

  // Strategy filter buttons
  const strategies: Array<{ key: string; label: string; color: string }> = [
    { key: 'competitive', label: 'Competitive', color: 'text-blue-500' },
    { key: 'clearance', label: 'Clearance', color: 'text-red-500' },
    { key: 'premium', label: 'Premium', color: 'text-purple-500' },
    { key: 'value', label: 'Value', color: 'text-green-500' },
    { key: 'dynamic', label: 'Dynamic', color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedStrategy === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedStrategy(null)}
        >
          All Rules ({rules.length})
        </Button>
        {strategies.map((strategy) => {
          const count = rules.filter((r) => r.strategy === strategy.key).length;
          if (count === 0) return null;

          return (
            <Button
              key={strategy.key}
              variant={selectedStrategy === strategy.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStrategy(strategy.key)}
              className={cn(
                selectedStrategy === strategy.key && 'pointer-events-none'
              )}
            >
              <span className={strategy.color}>●</span>
              <span className="ml-2">
                {strategy.label} ({count})
              </span>
            </Button>
          );
        })}
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRules?.map((rule) => (
          <PricingRuleCard
            key={rule.id}
            rule={rule}
            orgId={dispensaryId ?? ''}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onArchive={handleArchive}
          />
        ))}
      </div>

      {/* Filtered empty state */}
      {filteredRules && filteredRules.length === 0 && selectedStrategy && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No {selectedStrategy} rules found</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStrategy(null)}
            className="mt-2"
          >
            View all rules
          </Button>
        </div>
      )}
    </div>
  );
}
