'use client';

/**
 * Smokey Support Panel
 *
 * Main internal support hub for brand/dispensary admins and employees.
 * Features:
 * - Help article search (66+ articles)
 * - Direct messaging to Super User inbox
 * - Setup assistance and task recommendations
 * - Links to internal community/help center
 */

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Loader2, MessageSquare, Sparkles, Users } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/hooks/use-user';
import { logger } from '@/lib/logger';
import type { SetupHealth } from '@/types/agent-workspace';
import type { SmokeySupportHelpSeed, SmokeySupportMission } from '@/lib/dashboard/smokey-support-onboarding';
import { getSetupHealth } from '@/server/actions/setup-health';
import MessageSupportDialog from './message-support-dialog';

interface QuickLink {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  badge?: string;
}

interface SmokeySupportPanelProps {
  onHelpClick?: (seed?: SmokeySupportHelpSeed) => void;
  pinnedMission?: SmokeySupportMission | null;
  onMissionAction?: (mission: SmokeySupportMission) => void;
}

export function SmokeySupportPanel({
  onHelpClick,
  pinnedMission = null,
  onMissionAction,
}: SmokeySupportPanelProps) {
  const { role } = useUserRole();
  const { user } = useUser();
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);

  const firstName = user?.displayName?.split(' ')[0] || 'there';

  useEffect(() => {
    const loadSetupHealth = async () => {
      try {
        setLoading(true);

        if (!user?.uid || !role) {
          return;
        }

        const health = await getSetupHealth(user.uid, role);
        setQuickLinks(buildQuickLinks(role, health).slice(0, 3));
      } catch (error) {
        logger.error('Failed to load setup health', { error });
      } finally {
        setLoading(false);
      }
    };

    void loadSetupHealth();
  }, [role, user?.uid]);

  if (!role || !['brand', 'brand_admin', 'dispensary', 'dispensary_admin'].includes(role)) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Hi {firstName}
            </CardTitle>
            <CardDescription>How can we help?</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {pinnedMission && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                Your recommended first move
              </div>
              <div className="mt-2 space-y-1">
                <div className="font-medium">{pinnedMission.title}</div>
                <div className="text-sm text-muted-foreground">{pinnedMission.description}</div>
                <div className="text-xs text-muted-foreground">
                  Estimated time: {pinnedMission.estimatedTime}
                </div>
              </div>
              <div className="mt-3">
                {pinnedMission.primaryActionType === 'route' && pinnedMission.primaryActionHref ? (
                  <Button asChild className="h-auto w-full justify-start px-3 py-2">
                    <a
                      href={pinnedMission.primaryActionHref}
                      onClick={() => onMissionAction?.(pinnedMission)}
                    >
                      <Sparkles className="mr-2 h-4 w-4 flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-sm font-medium">{pinnedMission.primaryActionLabel}</div>
                        <div className="text-xs opacity-75">Start with the action we picked for you</div>
                      </div>
                    </a>
                  </Button>
                ) : (
                  <Button
                    className="h-auto w-full justify-start px-3 py-2"
                    onClick={() => {
                      onMissionAction?.(pinnedMission);
                      onHelpClick?.(pinnedMission.helpSeed);
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{pinnedMission.primaryActionLabel}</div>
                      <div className="text-xs opacity-75">Open the matching troubleshooting guides</div>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="default"
              className="h-auto justify-start px-3 py-2"
              onClick={onHelpClick ? () => onHelpClick() : undefined}
            >
              <HelpCircle className="mr-2 h-4 w-4 flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-medium">Find help articles</div>
                <div className="text-xs opacity-75">Search 66+ help guides</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-start px-3 py-2"
              onClick={() => setMessagingOpen(true)}
            >
              <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-medium">Message support team</div>
                <div className="text-xs opacity-75">Connect with Super Users</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto justify-start px-3 py-2"
              asChild
            >
              <a href="/help" target="_blank" rel="noopener noreferrer">
                <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">Go to community</div>
                  <div className="text-xs opacity-75">Browse help center</div>
                </div>
              </a>
            </Button>
          </div>

          {quickLinks.length > 0 && (
            <div className="border-t pt-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Recommended next steps</div>
              <div className="space-y-1">
                {quickLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    className="group flex items-center justify-between rounded-md p-2 text-sm transition-colors hover:bg-muted"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex-shrink-0 text-muted-foreground group-hover:text-foreground">
                        {link.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{link.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{link.description}</div>
                      </div>
                    </div>
                    {link.badge && (
                      <span className="ml-2 inline-block flex-shrink-0 whitespace-nowrap rounded bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {link.badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading recommendations...
            </div>
          )}
        </CardContent>
      </Card>

      <MessageSupportDialog open={messagingOpen} onOpenChange={setMessagingOpen} />
    </>
  );
}

function buildQuickLinks(role: string, health: SetupHealth): QuickLink[] {
  const links: QuickLink[] = [];

  if (role === 'brand' || role === 'brand_admin') {
    if (health.dataConnected.status !== 'green') {
      links.push({
        id: 'add-products',
        title: 'Add Products',
        description: 'Import your product catalog',
        href: '/dashboard/products',
        icon: <Sparkles className="h-4 w-4" />,
        badge: 'Setup',
      });
    }

    if (health.publishingLive.status !== 'green') {
      links.push({
        id: 'launch-menu',
        title: 'Launch Menu',
        description: 'Go live with your products',
        href: '/dashboard/brand-page',
        icon: <Sparkles className="h-4 w-4" />,
        badge: 'Setup',
      });
    }
  } else if (role === 'dispensary' || role === 'dispensary_admin') {
    if (health.dataConnected.status !== 'green') {
      links.push({
        id: 'connect-pos',
        title: 'Connect POS',
        description: 'Sync your inventory',
        href: '/dashboard/apps',
        icon: <Sparkles className="h-4 w-4" />,
        badge: 'Setup',
      });
    }

    if (health.complianceReady.status !== 'green') {
      links.push({
        id: 'setup-compliance',
        title: 'Configure Compliance',
        description: 'Set up Deebo defaults',
        href: '/dashboard/settings/compliance',
        icon: <Sparkles className="h-4 w-4" />,
        badge: 'Setup',
      });
    }

    if (health.publishingLive.status !== 'green') {
      links.push({
        id: 'publish-menu',
        title: 'Publish Menu',
        description: 'Go live to customers',
        href: '/dashboard/menu/publish',
        icon: <Sparkles className="h-4 w-4" />,
        badge: 'Setup',
      });
    }
  }

  return links;
}

export default SmokeySupportPanel;
