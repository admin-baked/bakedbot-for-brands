import { Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CannMenusAttributionProps {
  className?: string;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

/**
 * CannMenus data attribution badge.
 * Add wherever CannMenus-sourced data is displayed to users.
 */
export function CannMenusAttribution({ className, compact = false }: CannMenusAttributionProps) {
  return (
    <a
      href="https://cannmenus.com"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground',
        compact ? 'text-[10px]' : 'text-xs',
        className,
      )}
    >
      <Database className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span>Data Insights Powered by{' '}
        <span className="font-semibold underline decoration-dotted underline-offset-2">CannMenus</span>
      </span>
    </a>
  );
}
