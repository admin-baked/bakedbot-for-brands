'use client';

/**
 * Smokey Floating Support Button
 *
 * Floating action button (FAB) that opens the Smokey support panel.
 * Features smart positioning to avoid blocking critical UI elements.
 * Help content is shown inline within the panel (no modal overlay).
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, X, ChevronLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import SmokeySupportPanel from './smokey-support-panel';
import HelpSearchEnhanced from '@/components/help/help-search-enhanced';
import MessageSupportDialog from './message-support-dialog';

// Routes where FAB should NOT appear (interactive/form-heavy pages where it would block UI)
const BLOCKED_ROUTES = [
  '/dashboard/inbox',
  '/dashboard/campaigns/new',
  '/dashboard/campaigns/edit',
  '/dashboard/creative',
  '/dashboard/craig/campaigns',
  '/dashboard/products',
  '/dashboard/menu',
  '/dashboard/apps',
  '/dashboard/settings',
  '/dashboard/brand-page',
  '/dashboard/brand-guide',
  '/dashboard/playbooks',
  '/dashboard/drive',
  '/dashboard/loyalty-settings',
  '/dashboard/email-warmup',
  '/dashboard/orders',
  '/dashboard/audience',
  '/dashboard/delivery',
  '/dashboard/dispensary',
];

export function SmokeyFloatingButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'home' | 'help'>('home');
  const [messagingOpen, setMessagingOpen] = useState(false);
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

  // Handle dismiss - must be declared before any conditional returns
  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('smokey-support-dismissed', 'true');
  }, []);

  // Handle reopen - must be declared before any conditional returns
  const handleReopen = useCallback(() => {
    setDismissed(false);
    localStorage.setItem('smokey-support-dismissed', 'false');
  }, []);

  // Handle help click - must be declared before any conditional returns
  const handleHelpClick = useCallback(() => {
    setView('help');
  }, []);

  // Handle back click - must be declared before any conditional returns
  const handleBackClick = useCallback(() => {
    setView('home');
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
        {open && !dismissed ? null : (
          <div className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded opacity-75">
            Need help? Click the button →
          </div>
        )}

        {/* FAB */}
        <Button
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </div>

      {/* Inline Panel (not a modal overlay) */}
      {open && !dismissed && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] shadow-2xl rounded-2xl border bg-background overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              {view === 'help' && (
                <button
                  onClick={handleBackClick}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold text-sm">
                  {view === 'home' ? 'Smokey Support' : 'Help Center'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setView('home');
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="overflow-y-auto max-h-[60vh] p-4">
            {view === 'home' ? (
              <SmokeySupportPanel onHelpClick={handleHelpClick} />
            ) : (
              <HelpSearchEnhanced userRole={role || undefined} />
            )}
          </div>

          {/* Panel Footer (only on home view) */}
          {view === 'home' && (
            <div className="border-t px-4 py-3 bg-muted/20">
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
          )}
        </div>
      )}

      {/* Show reopen button if dismissed */}
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

      {/* Message Support Dialog (still a modal since it's a form) */}
      <MessageSupportDialog open={messagingOpen} onOpenChange={setMessagingOpen} />
    </>
  );
}

export default SmokeyFloatingButton;
