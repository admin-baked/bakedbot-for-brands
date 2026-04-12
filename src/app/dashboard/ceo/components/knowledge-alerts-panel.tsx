'use client';

/**
 * KnowledgeAlertsPanel
 *
 * Boardroom side panel showing active knowledge alerts.
 * Sorted by severity: critical → warning → info.
 * Mirrors to insights surface on warning/critical.
 */

import type { KnowledgeAlert } from '@/server/services/knowledge-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertOctagon, AlertTriangle, Info } from 'lucide-react';

interface KnowledgeAlertsPanelProps {
  tenantId: string;
  alerts: KnowledgeAlert[];
  severity?: 'info' | 'warning' | 'critical';
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  warning: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === 'critical') return <AlertOctagon className="h-4 w-4 text-red-500 shrink-0" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />;
  return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
};

const CATEGORY_LABELS: Record<string, string> = {
  competitive: 'Competitive',
  campaign: 'Campaign',
  playbook: 'Playbook',
  boardroom: 'Boardroom',
};

const OWNER_LABELS: Record<string, string> = {
  marty: 'Marty',
  craig: 'Craig',
  ezal: 'Ezal',
  ops: 'Ops',
};

export function KnowledgeAlertsPanel({ alerts, severity }: KnowledgeAlertsPanelProps) {
  const filtered = severity ? alerts.filter(a => a.severity === severity) : alerts;
  const sorted = [...filtered].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Knowledge Alerts
          {sorted.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              {sorted.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active alerts.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map(alert => {
              const styles = SEVERITY_STYLES[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 space-y-1 ${styles.bg} ${styles.border}`}
                >
                  <div className="flex items-center gap-2">
                    <SeverityIcon severity={alert.severity} />
                    <span className={`text-xs font-medium ${styles.text}`}>{alert.title}</span>
                    <Badge
                      variant="outline"
                      className={`ml-auto text-xs ${styles.bg} ${styles.text} ${styles.border}`}
                    >
                      {CATEGORY_LABELS[alert.category] ?? alert.category}
                    </Badge>
                  </div>
                  <p className="text-xs leading-snug pl-6">{alert.summary}</p>
                  <div className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
                    <span>Owner: {OWNER_LABELS[alert.actionOwner] ?? alert.actionOwner}</span>
                    {alert.mirroredInsightId && (
                      <span className="text-green-600">• Mirrored to Insights</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
