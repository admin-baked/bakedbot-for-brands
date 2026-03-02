'use client';

import { AgentsGrid } from '@/components/dashboard/agent-grid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';
import { useUserRole } from '@/hooks/use-user-role';
import { BarChart3, Sparkles, Users } from 'lucide-react';

export default function DashboardWelcome() {
  const { navLinks } = useDashboardConfig();
  const { role } = useUserRole();

  const accountLink = navLinks.find((link) => link.href === '/account');
  const agentsLink = navLinks.find((link) => link.href.startsWith('/dashboard/agents'));

  return (
    <div className="space-y-6">
      {/* Top welcome + quick stats */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              Welcome back
            </p>
            <CardTitle className="text-lg font-semibold">
              {role === 'grower' ? 'Your Wholesale Hub is Active.' : 'Your AI agents are on shift.'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {role === 'grower' ? (
              <>
                <p>
                  This is your command center for <span className="font-medium text-foreground">B2B wholesale commerce</span>.
                  Manage your harvest, track brand relationships, and scale your wholesale footprint.
                </p>
                <p>
                  Start by reviewing your <span className="font-medium">yield analytics</span> and{' '}
                  <span className="font-medium">wholesale availability</span> lists.
                </p>
              </>
            ) : (
              <>
                <p>
                  This is your command center for <span className="font-medium text-foreground">autonomous cannabis commerce</span>.
                  Keep customers in your brand funnel while Smokey, Craig, Pops and crew handle the heavy lifting.
                </p>
                <p>
                  Start by tuning your <span className="font-medium">agents</span> and{' '}
                  <span className="font-medium">account settings</span>, then plug in menus, campaigns, and analytics.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Agents active
                </p>
                <p className="text-sm font-semibold">4 / 6</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Conversations today
                </p>
                <p className="text-sm font-semibold">238</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 hidden sm:block lg:block">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Attributed revenue (7d)
                </p>
                <p className="text-sm font-semibold">$18.4k</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Agent grid */}
      <AgentsGrid />

      {/* Optional “next steps” row */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tune your agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              Set guardrails, tones, and goals so Smokey, Craig, and Pops reflect your brand voice and priorities.
            </p>
            {agentsLink ? (
              <a
                href={agentsLink.href}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Go to Agents →
              </a>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lock in your brand account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              Add your brand details, jurisdictions, and stack so Deebo and Money Mike stay compliant and margin-aware.
            </p>
            {accountLink ? (
              <a
                href={accountLink.href}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Open Account Settings →
              </a>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
