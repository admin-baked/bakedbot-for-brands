'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { InboxArtifact } from '@/types/inbox';
import type { IntegrationRequest } from '@/types/service-integrations';
import { INTEGRATION_METADATA } from '@/types/service-integrations';

interface Props {
  artifact: InboxArtifact;
  className?: string;
}

export function InboxIntegrationCard({ artifact, className }: Props) {
  const data = artifact.data as IntegrationRequest;
  const metadata = INTEGRATION_METADATA[data.provider];

  const handleConnect = () => {
    if (data.authMethod === 'oauth') {
      const service = data.provider;
      const returnTo = data.threadId ? `/dashboard/inbox?thread=${data.threadId}` : '/dashboard/inbox';
      window.location.href = `/api/auth/google?service=${service}&redirect=${encodeURIComponent(returnTo)}`;
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{metadata?.icon || '🔌'}</span>
          <div className="flex-1">
            <h4 className="font-semibold">{metadata?.name || data.provider}</h4>
            <p className="text-sm text-muted-foreground mt-1">{data.reason}</p>
            <Button onClick={handleConnect} className="mt-3" size="sm">
              Connect {metadata?.name || data.provider}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
