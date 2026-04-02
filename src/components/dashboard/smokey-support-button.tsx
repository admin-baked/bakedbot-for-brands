'use client';

/**
 * Smokey Side Tab + Support Panel
 *
 * A vertical tab pinned to the right edge of the viewport that opens
 * the Smokey support panel. Replaces the old floating action button (FAB).
 * The tab is always visible (minimal footprint) — no dismiss-forever needed.
 */

import { useState, useCallback } from 'react';
import { Sparkles, X, ChevronLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import SmokeySupportPanel from './smokey-support-panel';
import HelpSearchEnhanced from '@/components/help/help-search-enhanced';

// Hide on routes with dense primary actions where the tab could steal clicks.
const BLOCKED_ROUTES = ['/dashboard/menu', '/dashboard/settings', '/dashboard/creative'];

export function SmokeyFloatingButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'home' | 'help'>('home');
  const pathname = usePathname();
  const { role } = useUserRole();

  const isBlocked = BLOCKED_ROUTES.some((route) => pathname.includes(route));

  const handleHelpClick = useCallback(() => setView('help'), []);
  const handleBackClick = useCallback(() => setView('home'), []);

  const handleRestartOnboarding = useCallback(() => {
    localStorage.removeItem('setup-checklist-dismissed');
    window.dispatchEvent(new CustomEvent('restart-onboarding'));
    setOpen(false);
    setView('home');
  }, []);

  const handleTabClick = useCallback(() => {
    setOpen((prev) => {
      if (prev) setView('home');
      return !prev;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setView('home');
  }, []);

  // Only show for brand/dispensary users
  if (!role || !['brand', 'brand_admin', 'dispensary', 'dispensary_admin'].includes(role)) {
    return null;
  }

  if (isBlocked) return null;

  return (
    <>
      {/* Side Tab — always visible, pinned to right edge */}
      <button
        onClick={handleTabClick}
        title={open ? 'Close support panel' : 'Open Help & Setup'}
        aria-label={open ? 'Close support panel' : 'Open Help & Setup'}
        className="fixed right-0 top-[45%] -translate-y-1/2 z-50 flex flex-col items-center justify-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-4 rounded-l-xl shadow-lg hover:shadow-xl hover:px-3.5 transition-all duration-150 cursor-pointer select-none"
      >
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span className="text-[9px] font-bold tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 leading-none">
          {open ? 'Close' : 'Help'}
        </span>
      </button>

      {/* Side Panel — slides in from the right, offset to keep tab visible */}
      {open && (
        <div className="fixed right-10 top-16 z-50 w-80 max-h-[80vh] shadow-2xl rounded-2xl border bg-background overflow-hidden flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-shrink-0">
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
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">
                {view === 'home' ? 'Smokey Support' : 'Help Center'}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="overflow-y-auto flex-1 p-4">
            {view === 'home' ? (
              <SmokeySupportPanel
                onHelpClick={handleHelpClick}
                onRestartOnboarding={handleRestartOnboarding}
              />
            ) : (
              <HelpSearchEnhanced userRole={role || undefined} />
            )}
          </div>
        </div>
      )}

    </>
  );
}

export default SmokeyFloatingButton;
