import React from 'react';
import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode | {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-2 border-dashed">
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
        {action && typeof action === 'object' && 'onClick' in action ? (
          <button onClick={action.onClick}>
            {action.label}
          </button>
        ) : action ? (
          <div>{action}</div>
        ) : null}
      </div>
    </Card>
  );
}
