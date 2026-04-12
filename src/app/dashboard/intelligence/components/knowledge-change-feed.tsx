'use client';

/**
 * KnowledgeChangeFeed
 *
 * Shows recent competitive or campaign knowledge changes with state badges,
 * confidence scores, and source attribution.
 * Rendered beneath strategic analysis on the Intelligence dashboard.
 */

import type { KnowledgeSearchResult } from '@/server/services/knowledge-engine';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface KnowledgeChangeFeedProps {
  tenantId: string;
  domain: 'competitive_intel' | 'campaign_history';
  results: KnowledgeSearchResult[];
}

const STATE_COLORS: Record<string, string> = {
  verified_fact: 'bg-green-100 text-green-800 border-green-200',
  working_fact: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  signal: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATE_LABELS: Record<string, string> = {
  verified_fact: 'Verified',
  working_fact: 'Working Fact',
  signal: 'Signal',
};

export function KnowledgeChangeFeed({ domain, results }: KnowledgeChangeFeedProps) {
  const label = domain === 'competitive_intel' ? 'Competitive Changes' : 'Campaign Patterns';

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent knowledge updates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {label}
          <span className="ml-auto text-xs text-muted-foreground">{results.length} item(s)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map(result => (
          <div key={result.claimId} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm leading-snug flex-1">{result.text}</p>
              <Badge
                variant="outline"
                className={`shrink-0 text-xs ${STATE_COLORS[result.state] ?? ''}`}
              >
                {STATE_LABELS[result.state] ?? result.state}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{(result.confidenceScore * 100).toFixed(0)}% confidence</span>
              {result.sourceTitles.length > 0 && (
                <span>Source: {result.sourceTitles[0]}</span>
              )}
              {result.entityNames.length > 0 && (
                <span>
                  {result.entityNames.slice(0, 2).join(', ')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">{result.explanation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
