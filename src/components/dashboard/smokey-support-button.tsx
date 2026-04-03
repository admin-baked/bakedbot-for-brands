'use client';

/**
 * Smokey Side Tab + Support Panel
 *
 * Opens to the onboarding checklist by default.
 * Users can navigate to the Help Center from there and always return.
 *
 * Views:
 *   'onboarding' — setup checklist (default)
 *   'help'       — help search + support actions
 */

import { useState, useCallback, useEffect } from 'react';
import { Sparkles, X, ChevronLeft, CheckCircle, Circle, ChevronRight, Clock, ArrowRight, HelpCircle, MessageSquare, Users, RotateCcw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/hooks/use-user';
import { useBrandGuide } from '@/hooks/use-brand-guide';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import HelpSearchEnhanced from '@/components/help/help-search-enhanced';
import MessageSupportDialog from './message-support-dialog';
import {
  getDefaultOnboardingPrimaryGoal,
  normalizeOnboardingPrimaryGoal,
} from '@/lib/onboarding/activation';
import {
  buildChecklistItems,
  getLinkedDispensaryStatus,
  type ChecklistItem,
} from './setup-checklist';

// Hide on routes with dense primary actions where the tab could steal clicks.
const BLOCKED_ROUTES = ['/dashboard/menu', '/dashboard/settings', '/dashboard/creative'];

type View = 'onboarding' | 'help';

// ─────────────────────────────────────────────────────────────
// Onboarding panel view — always accessible, no dismiss button
// ─────────────────────────────────────────────────────────────
function OnboardingPanelView({ onHelpClick }: { onHelpClick: () => void }) {
  const { role, isBrandRole, isDispensaryRole, orgId } = useUserRole();
  const { userData, isLoading: isUserLoading } = useUser();
  const { brandGuide } = useBrandGuide(orgId || '');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const primaryGoal =
    normalizeOnboardingPrimaryGoal(userData?.onboarding?.primaryGoal)
    || getDefaultOnboardingPrimaryGoal(role);
  const competitorCount = userData?.onboarding?.selectedCompetitorCount || 0;
  const brandGuideComplete = (brandGuide?.completenessScore || 0) >= 80;

  useEffect(() => {
    let active = true;

    async function load() {
      if (isUserLoading) {
        return;
      }

      const roleType = isBrandRole ? 'brand' : isDispensaryRole ? 'dispensary' : null;
      if (!roleType) {
        if (active) {
          setItems([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      let linkedStatus = { isLinked: false, posConnected: false };
      if (roleType === 'dispensary') {
        linkedStatus = await getLinkedDispensaryStatus();
      }

      if (!active) {
        return;
      }

      setItems(buildChecklistItems({
        roleType,
        primaryGoal,
        brandGuideComplete,
        linkedStatus,
        competitorCount,
      }));
      setIsLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [brandGuideComplete, competitorCount, isBrandRole, isDispensaryRole, isUserLoading, primaryGoal]);

  const completedCount = items.filter(i => i.status === 'done').length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 animate-pulse mr-2" />
        Loading your setup guide...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="space-y-2">
        {allDone ? (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            Setup complete! You're all set.
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{completedCount} of {totalCount} steps done</span>
            <span className="text-muted-foreground text-xs">{Math.round(progressPercent)}%</span>
          </div>
        )}
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Checklist items */}
      {totalCount > 0 && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors group',
                item.status === 'done'
                  ? 'opacity-50'
                  : 'hover:bg-muted/60'
              )}
            >
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                item.status === 'done'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}>
                {item.status === 'done'
                  ? <CheckCircle className="h-3.5 w-3.5" />
                  : <Circle className="h-3.5 w-3.5" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'text-sm font-medium leading-snug',
                  item.status === 'done' && 'line-through'
                )}>
                  {item.title}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {item.estimatedTime}
                </div>
              </div>
              {item.status !== 'done' && (
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Footer — navigate to Help */}
      <div className="border-t pt-3">
        <Button
          variant={allDone ? 'default' : 'outline'}
          className="w-full justify-between"
          onClick={onHelpClick}
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            {allDone ? 'Explore Help Center' : 'View Help Docs'}
          </span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Help panel view — wraps help search + support actions
// ─────────────────────────────────────────────────────────────
function HelpPanelView({
  role,
  onOnboardingClick,
}: {
  role: string;
  onOnboardingClick: () => void;
}) {
  const [messagingOpen, setMessagingOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Help search */}
      <HelpSearchEnhanced userRole={role} />

      {/* Support actions */}
      <div className="border-t pt-3 grid grid-cols-1 gap-2">
        <Button
          variant="outline"
          className="justify-start h-auto py-2 px-3"
          onClick={() => setMessagingOpen(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
          <div className="text-left">
            <div className="font-medium text-sm">Message support team</div>
            <div className="text-xs opacity-75">Connect with Super Users</div>
          </div>
        </Button>

        <Button variant="outline" className="justify-start h-auto py-2 px-3" asChild>
          <a href="/help" target="_blank" rel="noopener noreferrer">
            <Users className="h-4 w-4 mr-2 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium text-sm">Go to community</div>
              <div className="text-xs opacity-75">Browse help center</div>
            </div>
          </a>
        </Button>

        {/* Always-accessible onboarding link */}
        <Button
          variant="ghost"
          className="justify-start h-auto py-2 px-3 text-muted-foreground hover:text-foreground w-full"
          onClick={onOnboardingClick}
        >
          <RotateCcw className="h-4 w-4 mr-2 flex-shrink-0" />
          <div className="text-left">
            <div className="font-medium text-sm">Review setup guide</div>
            <div className="text-xs opacity-75">Check your onboarding steps</div>
          </div>
        </Button>
      </div>

      <MessageSupportDialog open={messagingOpen} onOpenChange={setMessagingOpen} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export function SmokeyFloatingButton() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('onboarding');
  const pathname = usePathname();
  const { role } = useUserRole();

  const isBlocked = BLOCKED_ROUTES.some((route) => pathname.includes(route));

  const handleTabClick = useCallback(() => {
    setOpen((prev) => {
      if (!prev) setView('onboarding'); // always open to onboarding
      return !prev;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleHelpClick = useCallback(() => setView('help'), []);
  const handleOnboardingClick = useCallback(() => setView('onboarding'), []);

  // Only show for brand/dispensary users
  if (!role || !['brand', 'brand_admin', 'dispensary', 'dispensary_admin'].includes(role)) {
    return null;
  }

  if (isBlocked) return null;

  const headerTitle = view === 'onboarding' ? 'Setup Guide' : 'Help Center';

  return (
    <>
      {/* Side Tab */}
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

      {/* Side Panel */}
      {open && (
        <div className="fixed right-10 top-16 z-50 w-80 max-h-[80vh] shadow-2xl rounded-2xl border bg-background overflow-hidden flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              {view === 'help' && (
                <button
                  onClick={handleOnboardingClick}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Back to Setup Guide"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{headerTitle}</span>
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
            {view === 'onboarding' ? (
              <OnboardingPanelView onHelpClick={handleHelpClick} />
            ) : (
              <HelpPanelView role={role} onOnboardingClick={handleOnboardingClick} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SmokeyFloatingButton;
