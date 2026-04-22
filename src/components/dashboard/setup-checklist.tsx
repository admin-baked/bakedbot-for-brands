'use client';

/**
 * Setup Checklist Component
 *
 * Goal-aware onboarding checklist that prioritizes Brand Guide plus the
 * user's selected first win across Check-In, Competitive Intelligence,
 * and Creative Center before layering in playbooks and Inbox.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Store,
  Bot,
  FileSearch,
  Megaphone,
  Palette,
  CalendarDays,
  QrCode,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/hooks/use-user';
import { useBrandGuide } from '@/hooks/use-brand-guide';
import { cn } from '@/lib/utils';
import {
  getDefaultOnboardingPrimaryGoal,
  getOnboardingGoalDefinition,
  normalizeOnboardingPrimaryGoal,
  ONBOARDING_PHASE1_VERSION,
} from '@/lib/onboarding/activation';
import type { OnboardingPrimaryGoal } from '@/types/onboarding';
import { getCompletedOnboardingSteps } from '@/server/actions/onboarding-progress';

const DISMISS_KEY = `setup-checklist-dismissed-${ONBOARDING_PHASE1_VERSION}`;
const SEEN_KEY = `setup-checklist-seen-${ONBOARDING_PHASE1_VERSION}`;

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  href: string;
  icon: React.ReactNode;
  status: 'todo' | 'done';
}

export type ChecklistRoleType = 'brand' | 'dispensary';

interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  href: string;
  icon: React.ReactNode;
}

const TASKS: Record<string, ChecklistTemplate> = {
  'brand-guide': {
    id: 'brand-guide',
    title: 'Build your Brand Guide',
    description: 'Set your voice, colors, compliance, and assets before you scale agent work.',
    estimatedTime: '6 min',
    href: '/dashboard/settings/brand-guide',
    icon: <Palette className="h-4 w-4" />,
  },
  'link-dispensary': {
    id: 'link-dispensary',
    title: 'Link your dispensary',
    description: 'Confirm the retail location so check-in, menu, and reporting stay tenant-safe.',
    estimatedTime: '2 min',
    href: '/dashboard/settings/link',
    icon: <Store className="h-4 w-4" />,
  },
  'connect-pos': {
    id: 'connect-pos',
    title: 'Connect menu data',
    description: 'Bring in inventory so tablet recommendations and lifecycle content have real products.',
    estimatedTime: '5 min',
    href: '/dashboard/apps',
    icon: <Package className="h-4 w-4" />,
  },
  'checkin-manager': {
    id: 'checkin-manager',
    title: 'Launch Check-In with Tablet',
    description: 'Configure the live check-in flow, copy, and kiosk settings.',
    estimatedTime: '4 min',
    href: '/dashboard/dispensary/checkin',
    icon: <QrCode className="h-4 w-4" />,
  },
  'qr-training': {
    id: 'qr-training',
    title: 'Print QR & train staff',
    description: 'Open the QR/training page, preview the tablet flow, and run launch QA.',
    estimatedTime: '4 min',
    href: '/dashboard/loyalty-tablet-qr',
    icon: <Store className="h-4 w-4" />,
  },
  'creative-center': {
    id: 'creative-center',
    title: 'Create your first social draft',
    description: 'Use Creative Center to generate a first post with your brand voice and assets.',
    estimatedTime: '5 min',
    href: '/dashboard/creative',
    icon: <Megaphone className="h-4 w-4" />,
  },
  'content-calendar': {
    id: 'content-calendar',
    title: 'Put your first post on the calendar',
    description: 'Open the calendar view and plan what ships next after your first draft.',
    estimatedTime: '3 min',
    href: '/dashboard/creative',
    icon: <CalendarDays className="h-4 w-4" />,
  },
  'welcome-playbook': {
    id: 'welcome-playbook',
    title: 'Launch your Welcome Playbook',
    description: 'Connect email as needed, then review and turn on your personalized welcome automation.',
    estimatedTime: '5 min',
    href: '/dashboard/playbooks',
    icon: <Bot className="h-4 w-4" />,
  },
  'inbox-foundations': {
    id: 'inbox-foundations',
    title: 'Learn Inbox, Playbooks, and Agents',
    description: 'Open Inbox and follow the start-here briefing to learn how work lands and repeats here.',
    estimatedTime: '2 min',
    href: '/dashboard/inbox',
    icon: <Bot className="h-4 w-4" />,
  },
  'competitive-intel': {
    id: 'competitive-intel',
    title: 'Launch Competitive Intelligence Reports',
    description: 'Turn on Ezal’s daily report delivery so market intel lands in email and Slack where available.',
    estimatedTime: '3 min',
    href: '/dashboard/competitive-intel',
    icon: <FileSearch className="h-4 w-4" />,
  },
};

function getPrimaryTaskOrder(
  roleType: 'brand' | 'dispensary',
  primaryGoal: OnboardingPrimaryGoal,
): string[] {
  if (roleType === 'dispensary') {
    switch (primaryGoal) {
      case 'competitive_intelligence':
        return ['competitive-intel', 'checkin-manager', 'qr-training'];
      case 'creative_center':
        return ['creative-center', 'content-calendar', 'competitive-intel'];
      case 'welcome_playbook':
        return ['checkin-manager', 'qr-training', 'competitive-intel'];
      case 'checkin_tablet':
      default:
        return ['checkin-manager', 'qr-training', 'competitive-intel'];
    }
  }

  switch (primaryGoal) {
    case 'competitive_intelligence':
      return ['competitive-intel', 'creative-center', 'content-calendar'];
    case 'checkin_tablet':
      return ['creative-center', 'competitive-intel'];
    case 'welcome_playbook':
      return ['creative-center', 'content-calendar', 'competitive-intel'];
    case 'creative_center':
    default:
      return ['creative-center', 'content-calendar', 'competitive-intel'];
  }
}

export function buildChecklistItems(params: {
  roleType: ChecklistRoleType;
  primaryGoal: OnboardingPrimaryGoal;
  brandGuideComplete: boolean;
  linkedStatus: { isLinked: boolean; posConnected: boolean };
  competitiveIntelComplete: boolean;
  /** Server-persisted completed steps (supplements auto-detected completion) */
  serverCompletedSteps?: string[];
}): ChecklistItem[] {
  const { roleType, primaryGoal, brandGuideComplete, linkedStatus, competitiveIntelComplete, serverCompletedSteps } = params;

  const orderedIds: string[] = ['brand-guide'];

  if (roleType === 'dispensary') {
    orderedIds.push('link-dispensary', 'connect-pos');
  }

  orderedIds.push(...getPrimaryTaskOrder(roleType, primaryGoal), 'welcome-playbook', 'inbox-foundations');

  const seen = new Set<string>();
  const dedupedIds = orderedIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // Merge auto-detected + server-persisted completions
  const completed = new Set<string>(serverCompletedSteps || []);
  if (brandGuideComplete) completed.add('brand-guide');
  if (linkedStatus.isLinked) completed.add('link-dispensary');
  if (linkedStatus.posConnected) completed.add('connect-pos');
  if (competitiveIntelComplete) completed.add('competitive-intel');

  return dedupedIds.map((id) => ({
    ...TASKS[id],
    status: completed.has(id) ? 'done' : 'todo',
  }));
}

/**
 * Get linked dispensary status from Firestore
 */
export async function getLinkedDispensaryStatus(): Promise<{ isLinked: boolean; posConnected: boolean }> {
  try {
    const response = await fetch('/api/user/linked-dispensary');
    if (response.ok) {
      const data = await response.json();
      return {
        isLinked: !!data.linkedDispensary,
        posConnected: !!data.posConnected
      };
    }
  } catch (error) {
    console.error('Failed to check linked dispensary:', error);
  }
  return { isLinked: false, posConnected: false };
}

export async function getCompetitiveIntelSetupStatus(): Promise<{ isComplete: boolean }> {
  try {
    const response = await fetch('/api/user/competitive-intel-activation');
    if (response.ok) {
      const data = await response.json();
      return {
        isComplete: data?.run?.status === 'completed',
      };
    }
  } catch (error) {
    console.error('Failed to check competitive intel activation:', error);
  }

  return { isComplete: false };
}

export function SetupChecklist() {
  const { role, isBrandRole, isDispensaryRole, orgId } = useUserRole();
  const { userData, isLoading: isUserLoading } = useUser();
  const { brandGuide } = useBrandGuide(orgId || '');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasSeenBefore, setHasSeenBefore] = useState(true);
  const [linkedStatus, setLinkedStatus] = useState({ isLinked: false, posConnected: false });
  const [linkedStatusLoaded, setLinkedStatusLoaded] = useState(false);
  const [competitiveIntelComplete, setCompetitiveIntelComplete] = useState(false);
  const [competitiveIntelLoaded, setCompetitiveIntelLoaded] = useState(false);
  const [serverCompletedSteps, setServerCompletedSteps] = useState<string[]>([]);

  const primaryGoal =
    normalizeOnboardingPrimaryGoal(userData?.onboarding?.primaryGoal)
    || getDefaultOnboardingPrimaryGoal(role);
  const goalDefinition = getOnboardingGoalDefinition(primaryGoal);
  const brandGuideComplete = (brandGuide?.completenessScore || 0) >= 80;

  useEffect(() => {
    let active = true;

    if (!isDispensaryRole) {
      setLinkedStatusLoaded(true);
      return () => {
        active = false;
      };
    }

    setLinkedStatusLoaded(false);

    void (async () => {
      const nextStatus = await getLinkedDispensaryStatus();
      if (!active) return;
      setLinkedStatus(nextStatus);
      setLinkedStatusLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, [isDispensaryRole]);

  useEffect(() => {
    let active = true;
    setCompetitiveIntelLoaded(false);

    void (async () => {
      const [status, steps] = await Promise.all([
        getCompetitiveIntelSetupStatus(),
        getCompletedOnboardingSteps(),
      ]);
      if (!active) return;
      setCompetitiveIntelComplete(status.isComplete);
      setServerCompletedSteps(steps);
      setCompetitiveIntelLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
    const seen = localStorage.getItem(SEEN_KEY);
    if (!seen) {
      setHasSeenBefore(false);
      setIsExpanded(true);
      localStorage.setItem(SEEN_KEY, 'true');
    }
  }, []);

  useEffect(() => {
    const handleRestart = () => {
      localStorage.removeItem(DISMISS_KEY);
      setIsDismissed(false);
    };

    window.addEventListener('restart-onboarding', handleRestart);
    return () => window.removeEventListener('restart-onboarding', handleRestart);
  }, []);

  const items = useMemo(() => {
    if (isBrandRole) {
      return buildChecklistItems({
        roleType: 'brand',
        primaryGoal,
        brandGuideComplete,
        linkedStatus,
        competitiveIntelComplete,
        serverCompletedSteps,
      });
    }

    if (isDispensaryRole) {
      return buildChecklistItems({
        roleType: 'dispensary',
        primaryGoal,
        brandGuideComplete,
        linkedStatus,
        competitiveIntelComplete,
        serverCompletedSteps,
      });
    }

    return [] as ChecklistItem[];
  }, [brandGuideComplete, competitiveIntelComplete, isBrandRole, isDispensaryRole, linkedStatus, primaryGoal, serverCompletedSteps]);

  const completedCount = items.filter((item) => item.status === 'done').length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  if (
    role === 'customer'
    || isDismissed
    || isUserLoading
    || !role
    || (!linkedStatusLoaded && isDispensaryRole)
    || !competitiveIntelLoaded
  ) {
    return null;
  }

  if (completedCount === totalCount && totalCount > 0) {
    return null;
  }

  const nextTodo = items.find((item) => item.status !== 'done');

  if (!isExpanded) {
    return (
      <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{completedCount}/{totalCount}</span>
          </div>
          <Progress value={progressPercent} className="h-1.5 flex-1 max-w-[120px]" />
          {nextTodo && (
            <Link
              href={nextTodo.href}
              className="flex items-center gap-2 flex-1 min-w-0 hover:text-primary transition-colors group"
            >
              <span className="text-sm truncate">
                Next: <span className="font-medium">{nextTodo.title}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
            </Link>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
            >
              Expand
            </button>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Complete your setup
            </CardTitle>
            <CardDescription className="mt-1">
              {completedCount} of {totalCount} tasks complete. Start with {goalDefinition.title}.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <Progress value={progressPercent} className="h-1.5" />
          {!hasSeenBefore && (
            <p className="text-xs text-muted-foreground">
              Inbox is where work lands, Playbooks keep repeatable work running, and Agents help you execute the jobs below.
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors group',
                item.status === 'done'
                  ? 'opacity-60'
                  : 'hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                item.status === 'done'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}>
                {item.status === 'done' ? (
                  <CheckCircle className="h-3.5 w-3.5" />
                ) : (
                  item.icon
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'text-sm font-medium',
                  item.status === 'done' && 'line-through'
                )}>
                  {item.title}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.estimatedTime}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </Link>
          ))}
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1 w-full justify-center"
          >
            <ChevronDown className="h-3 w-3 rotate-180 transition-transform" />
            Show less
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
