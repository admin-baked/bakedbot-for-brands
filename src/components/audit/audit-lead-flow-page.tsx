'use client';

/**
 * Thin client wrapper used by the /free-audit server page.
 * Passes server-read UTM params into AuditLeadFlow without making the page client-only.
 */

import { AuditLeadFlow } from '@/components/audit/audit-lead-flow';

interface AuditLeadFlowPageProps {
  initialUrl?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  };
}

export function AuditLeadFlowPage({ initialUrl, utm }: AuditLeadFlowPageProps) {
  return <AuditLeadFlow initialUrl={initialUrl} utm={utm} />;
}
