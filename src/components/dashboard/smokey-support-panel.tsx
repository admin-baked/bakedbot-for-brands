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

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, HelpCircle, Users, Sparkles, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/hooks/use-user';
import { logger } from '@/lib/logger';
import HelpDialog from './help-dialog';
import MessageSupportDialog from './message-support-dialog';
import { getSetupHealth } from '@/server/actions/setup-health';

interface QuickLink {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

export function SmokeySupportPanel() {
  const { role } = useUserRole();
  const { user } = useUser();
  const [helpOpen, setHelpOpen] = useState(false);
  const [messagingOpen, setMessagingOpen] = useState(false);
  const [setupHealth, setSetupHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);

  const firstName = user?.displayName?.split(' ')[0] || 'there';

  // Load setup health to determine recommendations
  useEffect(() => {
    const loadSetupHealth = async () => {
      try {
        setLoading(true);
        if (!user?.uid || !role) {
          return;
        }
        const health = await getSetupHealth(user.uid, role);
        setSetupHealth(health);
        generateQuickLinks(health);
      } catch (error) {
        logger.error('Failed to load setup health', { error });
      } finally {
        setLoading(false);
      }
    };

    loadSetupHealth();
  }, [user?.uid, role]);

  // Generate contextual quick links based on role and setup status
  const generateQuickLinks = (health: any) => {
    const links: QuickLink[] = [];

    if (role === 'brand' || role === 'brand_admin') {
      // Brand-specific quick actions
      if (!health?.dataConnected) {
        links.push({
          id: 'add-products',
          title: 'Add Products',
          description: 'Import your product catalog',
          href: '/dashboard/products',
          icon: <Sparkles className="h-4 w-4" />,
          badge: 'Setup'
        });
      }

      if (!health?.publishingLive) {
        links.push({
          id: 'launch-menu',
          title: 'Launch Menu',
          description: 'Go live with your products',
          href: '/dashboard/brand-page',
          icon: <Sparkles className="h-4 w-4" />,
          badge: 'Setup'
        });
      }
    } else if (role === 'dispensary' || role === 'dispensary_admin') {
      // Dispensary-specific quick actions
      if (!health?.dataConnected) {
        links.push({
          id: 'connect-pos',
          title: 'Connect POS',
          description: 'Sync your inventory',
          href: '/dashboard/apps',
          icon: <Sparkles className="h-4 w-4" />,
          badge: 'Setup'
        });
      }

      if (!health?.complianceReady) {
        links.push({
          id: 'setup-compliance',
          title: 'Configure Compliance',
          description: 'Set up Deebo defaults',
          href: '/dashboard/settings/compliance',
          icon: <Sparkles className="h-4 w-4" />,
          badge: 'Setup'
        });
      }

      if (!health?.publishingLive) {
        links.push({
          id: 'publish-menu',
          title: 'Publish Menu',
          description: 'Go live to customers',
          href: '/dashboard/menu/publish',
          icon: <Sparkles className="h-4 w-4" />,
          badge: 'Setup'
        });
      }
    }

    setQuickLinks(links.slice(0, 3)); // Show top 3 recommendations
  };

  // Only show for brand/dispensary users (not customers or super users)
  if (!role || !['brand', 'brand_admin', 'dispensary', 'dispensary_admin'].includes(role)) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Hi {firstName} 👋
            </CardTitle>
            <CardDescription>How can we help?</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Primary Actions */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="default"
              className="justify-start h-auto py-2 px-3"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">Find help articles</div>
                <div className="text-xs opacity-75">Search 66+ help guides</div>
              </div>
            </Button>

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

            <Button
              variant="outline"
              className="justify-start h-auto py-2 px-3"
              asChild
            >
              <a href="/help" target="_blank" rel="noopener noreferrer">
                <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-sm">Go to community</div>
                  <div className="text-xs opacity-75">Browse help center</div>
                </div>
              </a>
            </Button>
          </div>

          {/* Quick Links Section */}
          {quickLinks.length > 0 && (
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">Recommended next steps</div>
              <div className="space-y-1">
                {quickLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground group-hover:text-foreground flex-shrink-0">
                        {link.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{link.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{link.description}</div>
                      </div>
                    </div>
                    {link.badge && (
                      <span className="inline-block px-2 py-0.5 ml-2 text-xs font-semibold bg-primary text-primary-foreground rounded whitespace-nowrap flex-shrink-0">
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
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading recommendations...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <MessageSupportDialog open={messagingOpen} onOpenChange={setMessagingOpen} />
    </>
  );
}

export default SmokeySupportPanel;
