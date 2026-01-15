'use client';

import { Shield, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type DeeboStatus = 'active' | 'warning' | 'review_needed';

interface DeeboBadgeProps {
  status: DeeboStatus;
  checks?: string[]; // List of specific checks passed/failed
  className?: string;
}

export function DeeboBadge({ status, checks = [], className }: DeeboBadgeProps) {
  const getStatusConfig = (s: DeeboStatus) => {
    switch (s) {
      case 'active':
        return {
          icon: ShieldCheck,
          label: 'Deebo Shield Active',
          color: 'text-green-500',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
        };
      case 'warning':
        return {
          icon: ShieldAlert,
          label: 'Compliance Warning',
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
        };
      case 'review_needed':
        return {
          icon: Shield,
          label: 'Audit in Progress',
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-help transition-colors',
              config.bg,
              config.color,
              config.border,
              className
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
            <div className="space-y-2">
                <p className="font-semibold text-xs flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    Compliance Audit
                </p>
                {checks.length > 0 ? (
                    <ul className="text-xs space-y-1 text-muted-foreground">
                        {checks.map((check, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                                <span className="text-green-500 mt-0.5">•</span>
                                {check}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        All state and platform regulations checked.
                    </p>
                )}
            </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
