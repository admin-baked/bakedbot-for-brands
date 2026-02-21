'use client';

/**
 * Help Dialog
 *
 * Embeds the help search interface in a modal dialog.
 * Provides role-based filtering of help articles.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, X } from 'lucide-react';
import HelpSearchEnhanced from '@/components/help/help-search-enhanced';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Help Center
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 overflow-hidden">
          <HelpSearchEnhanced />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default HelpDialog;
