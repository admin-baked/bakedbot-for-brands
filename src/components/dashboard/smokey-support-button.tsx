'use client';

/**
 * Smokey Floating Support Button
 *
 * Floating action button (FAB) that opens the Smokey support panel.
 * Features smart positioning to avoid blocking critical UI elements.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sparkles, X, ChevronLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import SmokeySupportPanel from './smokey-support-panel';

const BLOCKED_ROUTES = [
  '/dashboard/inbox',
  '/dashboard/campaigns/new',
  '/dashboard/creative',
  '/dashboard/craig/campaigns',
];

export function SmokeyFloatingButton() {
  const [open, setOpen] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();
  const { role } = useUserRole();

  // Determine if button should be hidden based on current route
  useEffect(() => {
    const hide = BLOCKED_ROUTES.some((route) => pathname.includes(route));
    setShouldHide(hide);
  }, [pathname]);

  // Load dismissed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('smokey-support-dismissed');
    if (saved === 'true') {
      setDismissed(true);
    }
  }, []);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('smokey-support-dismissed', 'true');
  }, []);

  // Handle reopen
  const handleReopen = useCallback(() => {
    setDismissed(false);
    localStorage.setItem('smokey-support-dismissed', 'false');
  }, []);

  // Only show for brand/dispensary users (not customers or super users)
  if (!role || !['brand', 'brand_admin', 'dispensary', 'dispensary_admin'].includes(role)) {
    return null;
  }

  // Hide on blocked routes or if dismissed
  if (shouldHide || dismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 items-end z-50">
        {/* Dismiss notice */}
        <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded opacity-75">
          Need help? Click the button →
        </div>

        {/* FAB */}
        <Button
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Smokey Support Hub
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <SmokeySupportPanel />
          </div>

          {/* Dismiss option at bottom */}
          <div className="mt-4 pt-3 border-t">
            <button
              onClick={() => {
                setOpen(false);
                handleDismiss();
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-2 px-2 rounded hover:bg-muted transition-colors"
            >
              Dismiss this help button
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Show reopen button in header if dismissed */}
      {dismissed && (
        <button
          onClick={handleReopen}
          className="fixed bottom-6 right-6 z-50 text-xs text-muted-foreground hover:text-foreground"
          title="Reopen Smokey Support Hub"
        >
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded hover:bg-muted/80 transition-colors">
            <Sparkles className="h-3 w-3" />
            Help
          </span>
        </button>
      )}
    </>
  );
}

export default SmokeyFloatingButton;
