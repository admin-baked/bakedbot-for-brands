'use client';

/**
 * KnowledgeExecutiveBrief
 *
 * Boardroom card showing: what changed, why it matters, what to do.
 * Fetched server-side and rendered as a static card for Marty's Mission Control tab.
 */

import type { KnowledgeSearchResult } from '@/server/services/knowledge-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react';

interface KnowledgeExecutiveBriefProps {
  tenantId: string;
  lookbackDays?: number;
  summary: string;
  claims: KnowledgeSearchResult[];
  actions: string[];
}

export function KnowledgeExecutiveBrief({
  summary,
  claims,
  actions,
}: KnowledgeExecutiveBriefProps) {
  const critical = claims.filter(c => c.confidenceScore >= 0.85 && c.state === 'verified_fact');
  const hasUrgent = critical.some(c =>
    c.text.toLowerCase().includes('price') || c.text.toLowerCase().includes('promo')
  );

  return (
    <Card className={hasUrgent ? 'border-orange-200' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          Knowledge Brief
          {hasUrgent && (
            <Badge variant="outline" className="ml-auto text-xs bg-orange-50 text-orange-700 border-orange-200">
              Action Required
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground">{summary}</p>

        {/* Top claims */}
        {critical.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground uppercase tracking-wide">What Changed</p>
            {critical.slice(0, 4).map(claim => (
              <div key={claim.claimId} className="flex items-start gap-2 text-sm">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <span className="leading-snug">{claim.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground ml-auto">
                  {(claim.confidenceScore * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground uppercase tracking-wide">Recommended Actions</p>
            {actions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                <span className="leading-snug">{action}</span>
              </div>
            ))}
          </div>
        )}

        {claims.length === 0 && (
          <p className="text-sm text-muted-foreground">No significant knowledge updates in this window.</p>
        )}
      </CardContent>
    </Card>
  );
}
