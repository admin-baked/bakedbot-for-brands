'use client';

/**
 * Action Confirmation Modal
 *
 * Confirm high-risk browser actions before execution.
 */

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock } from 'lucide-react';

import type { PendingConfirmation, HighRiskAction } from '@/types/browser-automation';

interface ActionConfirmationModalProps {
  confirmation: PendingConfirmation | null;
  onConfirm: () => void;
  onDeny: () => void;
  onClose: () => void;
}

const ACTION_LABELS: Record<HighRiskAction, string> = {
  purchase: 'Make a Purchase',
  publish: 'Publish Content',
  delete: 'Delete Data',
  share: 'Share Information',
  login: 'Log In',
  payment: 'Process Payment',
};

const ACTION_ICONS: Record<HighRiskAction, React.ReactNode> = {
  purchase: '💳',
  publish: '📤',
  delete: '🗑️',
  share: '🔗',
  login: '🔐',
  payment: '💰',
};

const ACTION_COLORS: Record<HighRiskAction, string> = {
  purchase: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  publish: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  share: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  login: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  payment: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export function ActionConfirmationModal({
  confirmation,
  onConfirm,
  onDeny,
  onClose,
}: ActionConfirmationModalProps) {
  if (!confirmation) return null;

  const expiresAt = confirmation.expiresAt?.toDate?.() || new Date(confirmation.expiresAt as unknown as string);
  const timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Dialog open={!!confirmation} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>
                This action requires your approval
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action Type Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Action Type:</span>
            <Badge className={ACTION_COLORS[confirmation.action]}>
              <span className="mr-1">{ACTION_ICONS[confirmation.action]}</span>
              {ACTION_LABELS[confirmation.action]}
            </Badge>
          </div>

          {/* Domain */}
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Domain:</span>
            <span className="font-medium">{confirmation.domain}</span>
          </div>

          {/* Description */}
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm font-medium">Action Details:</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {confirmation.description}
            </p>
          </div>

          {/* Time remaining */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Expires in {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>

          {/* Warning */}
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Warning:</strong> This action may have real-world consequences.
              Only approve if you trust the source and understand what will happen.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDeny}>
            Deny
          </Button>
          <Button onClick={onConfirm}>
            Approve Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
