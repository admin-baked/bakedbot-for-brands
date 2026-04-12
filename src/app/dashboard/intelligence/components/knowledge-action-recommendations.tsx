'use client';

/**
 * KnowledgeActionRecommendations
 *
 * Shows top recommended actions derived from verified knowledge claims.
 * Each recommendation links to the underlying claim evidence.
 */

import type { KnowledgeSearchResult } from '@/server/services/knowledge-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

interface KnowledgeActionRecommendationsProps {
  tenantId: string;
  results: KnowledgeSearchResult[];
}

const OWNER_LABELS: Record<string, string> = {
  competitor_promo: 'Craig',
  competitor_price_shift: 'Ezal',
  campaign_pattern: 'Craig',
  playbook_pattern: 'Ops',
  flow_pattern: 'Ops',
  recommendation: 'Marty',
  risk: 'Marty',
};

function deriveOwner(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('competitor') || lower.includes('promo')) return 'Craig';
  if (lower.includes('price') || lower.includes('pricing')) return 'Ezal';
  if (lower.includes('playbook') || lower.includes('flow')) return 'Ops';
  return 'Marty';
}

function deriveActionText(result: KnowledgeSearchResult): string {
  const lower = result.text.toLowerCase();
  if (lower.includes('competitor') && lower.includes('promo')) {
    return `Review promotional response strategy`;
  }
  if (lower.includes('price')) {
    return `Verify competitor pricing behavior`;
  }
  if (lower.includes('playbook') || lower.includes('checkin')) {
    return `Tune playbook for better performance`;
  }
  if (lower.includes('campaign')) {
    return `Apply campaign pattern to next launch`;
  }
  return `Review and act on this signal`;
}

export function KnowledgeActionRecommendations({ results }: KnowledgeActionRecommendationsProps) {
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No high-confidence actions ready yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          Recommended Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((result, idx) => {
          const owner = deriveOwner(result.text);
          const actionText = deriveActionText(result);

          return (
            <div key={result.claimId} className="flex items-start gap-3 py-2 border-b last:border-0">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium">{actionText}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{result.text}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">{owner}</Badge>
                  <span>{(result.confidenceScore * 100).toFixed(0)}% confidence</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
