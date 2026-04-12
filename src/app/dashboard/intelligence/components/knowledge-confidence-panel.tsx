'use client';

/**
 * KnowledgeConfidencePanel
 *
 * Shows the overall trust health of the knowledge base for this tenant:
 * verified count, working facts, signals, and average confidence.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import type { KnowledgeConfidenceSummary } from '../actions/knowledge';

interface KnowledgeConfidencePanelProps {
  averageConfidence: number;
  verifiedCount: number;
  workingFactCount: number;
  signalCount: number;
}

export function KnowledgeConfidencePanel({
  averageConfidence,
  verifiedCount,
  workingFactCount,
  signalCount,
}: KnowledgeConfidencePanelProps) {
  const total = verifiedCount + workingFactCount + signalCount;

  const healthColor =
    averageConfidence >= 0.80 ? 'text-green-600' :
    averageConfidence >= 0.60 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Knowledge Confidence
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No knowledge items yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${healthColor}`}>
                {(averageConfidence * 100).toFixed(0)}%
              </span>
              <span className="text-sm text-muted-foreground">average confidence</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-green-700">{verifiedCount}</div>
                <div className="text-xs text-green-600">Verified</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-yellow-700">{workingFactCount}</div>
                <div className="text-xs text-yellow-600">Working Facts</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-lg font-semibold text-gray-600">{signalCount}</div>
                <div className="text-xs text-gray-500">Signals</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {total} total knowledge item(s) in the past 30 days
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
