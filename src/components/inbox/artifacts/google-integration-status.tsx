'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, FolderOpen, Sheet } from 'lucide-react';

export interface GoogleServiceStatus {
  status: 'online' | 'offline' | 'pending';
  connectUrl?: string;
}

export interface GoogleIntegrationStatusData {
  gmail?: GoogleServiceStatus;
  calendar?: GoogleServiceStatus;
  drive?: GoogleServiceStatus;
  sheets?: GoogleServiceStatus;
}

interface Props {
  data: GoogleIntegrationStatusData;
  className?: string;
}

const SERVICE_CONFIG = {
  gmail: {
    name: 'Gmail',
    icon: Mail,
    color: 'text-red-500',
  },
  calendar: {
    name: 'Calendar',
    icon: Calendar,
    color: 'text-blue-500',
  },
  drive: {
    name: 'Drive',
    icon: FolderOpen,
    color: 'text-green-500',
  },
  sheets: {
    name: 'Sheets',
    icon: Sheet,
    color: 'text-emerald-500',
  },
} as const;

export function GoogleIntegrationStatus({ data, className }: Props) {
  const handleConnect = (service: keyof typeof SERVICE_CONFIG) => {
    const serviceData = data[service];
    if (serviceData?.connectUrl) {
      window.location.href = serviceData.connectUrl;
    } else {
      const returnTo = '/dashboard/inbox';
      window.location.href = `/api/auth/google?service=${service}&redirect=${encodeURIComponent(returnTo)}`;
    }
  };

  return (
    <div className={className}>
      <h4 className="font-semibold mb-3 text-sm">Google Workspace Integrations</h4>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(SERVICE_CONFIG).map(([key, config]) => {
          const serviceKey = key as keyof typeof SERVICE_CONFIG;
          const serviceData = data[serviceKey];
          if (!serviceData) return null;

          const Icon = config.icon;
          const isOnline = serviceData.status === 'online';

          return (
            <Card key={key} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <Icon className={`h-6 w-6 ${config.color}`} />
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{config.name}</h5>
                    <Badge
                      variant={isOnline ? 'default' : 'secondary'}
                      className="mt-1 text-xs"
                    >
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  {!isOnline && (
                    <Button
                      onClick={() => handleConnect(serviceKey)}
                      size="sm"
                      className="w-full mt-1"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Parse Google integration status markers from agent responses
 * Format: :::google:status\n{json}\n:::
 */
export function parseGoogleIntegrationStatus(content: string): {
  status: GoogleIntegrationStatusData | null;
  cleanedContent: string;
} {
  const pattern = /:::google:status\s*\n([\s\S]*?)\n:::/g;
  let match: RegExpExecArray | null;
  let status: GoogleIntegrationStatusData | null = null;
  let cleanedContent = content;

  while ((match = pattern.exec(content)) !== null) {
    try {
      const jsonStr = match[1].trim();
      status = JSON.parse(jsonStr) as GoogleIntegrationStatusData;
      cleanedContent = cleanedContent.replace(match[0], '');
    } catch (e) {
      console.warn('[GoogleIntegrationStatus] Failed to parse JSON:', e);
    }
  }

  return { status, cleanedContent: cleanedContent.trim() };
}
