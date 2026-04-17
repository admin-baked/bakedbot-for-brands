'use client';

import { Badge } from '@/components/ui/badge';
import { getPlaybookReadiness } from '@/config/playbook-readiness';
import {
  READINESS_DESCRIPTIONS,
  READINESS_LABELS,
  type PlaybookReadiness,
} from '@/config/workflow-runtime';
import { cn } from '@/lib/utils';

const READINESS_BADGE_STYLES: Record<PlaybookReadiness, string> = {
  executable_now: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial_support: 'border-amber-200 bg-amber-50 text-amber-700',
  template_only: 'border-slate-200 bg-slate-100 text-slate-700',
  experimental: 'border-violet-200 bg-violet-50 text-violet-700',
  legacy: 'border-rose-200 bg-rose-50 text-rose-700',
};

type PlaybookReadinessIndicatorProps = {
  playbookId: string;
  showDescription?: boolean;
  className?: string;
  descriptionClassName?: string;
};

export function PlaybookReadinessIndicator({
  playbookId,
  showDescription = false,
  className,
  descriptionClassName,
}: PlaybookReadinessIndicatorProps) {
  const readiness = getPlaybookReadiness(playbookId);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Badge
        variant="outline"
        className={cn('w-fit font-medium', READINESS_BADGE_STYLES[readiness])}
      >
        {READINESS_LABELS[readiness]}
      </Badge>
      {showDescription && (
        <p className={cn('text-xs leading-5 text-muted-foreground', descriptionClassName)}>
          {READINESS_DESCRIPTIONS[readiness]}
        </p>
      )}
    </div>
  );
}
