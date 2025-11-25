'use client';

import Link from 'next/link';
import { Bot, MessageSquareMore, Mail, LineChart, ShieldCheck, Percent, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type AgentCard = {
  id: string;
  name: string;
  role: string;
  status: 'Active' | 'Beta' | 'Planned';
  description: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tags: string[];
};

const AGENTS: AgentCard[] = [
  {
    id: 'smokey',
    name: 'Smokey',
    role: 'AI Budtender · Headless Menu',
    status: 'Active',
    description: 'Answers product questions, powers SEO-first menus, and keeps customers in your brand funnel.',
    href: '/dashboard/agents/smokey',
    icon: Bot,
    tags: ['Customer-facing', 'SEO', 'Menu'],
  },
  {
    id: 'craig',
    name: 'Craig',
    role: 'Email & SMS · Lifecycle',
    status: 'Active',
    description: 'Runs automated campaigns for drops, promos, and flows triggered by Smokey and menu events.',
    href: '/dashboard/agents/craig',
    icon: Mail,
    tags: ['Lifecycle', 'Campaigns', 'Flows'],
  },
  {
    id: 'pops',
    name: 'Pops',
    role: 'Revenue · Cohorts & Forecasts',
    status: 'Active',
    description: 'Tracks cohorts, CLV, and promo lift so every “free eighth” has receipts attached.',
    href: '/dashboard/agents/pops',
    icon: LineChart,
    tags: ['BI', 'Forecasting', 'Attribution'],
  },
  {
    id: 'ezal',
    name: 'Ezal',
    role: 'Competitive Watch · Menus & Pricing',
    status: 'Active',
    description: 'Monitors competing menus, price moves, and SKU gaps across your priority markets.',
    href: '/dashboard/agents/ezal',
    icon: Search,
    tags: ['Competitive', 'Pricing', 'Market Intel'],
  },
  {
    id: 'money-mike',
    name: 'Money Mike',
    role: 'Margin · Smart Pricing',
    status: 'Beta',
    description: 'Suggests price moves by SKU, dispensary, and channel to protect margin while growing volume.',
    href: '/dashboard/agents/money-mike',
    icon: Percent,
    tags: ['Pricing', 'Margin', 'Experiments'],
  },
  {
    id: 'mrs-parker',
    name: 'Mrs. Parker',
    role: 'Loyalty · Offers & Rewards',
    status: 'Planned',
    description: 'Designs offer ladders and rewards tuned to each customer segment and jurisdiction.',
    href: '/dashboard/agents/mrs-parker',
    icon: MessageSquareMore,
    tags: ['Loyalty', 'Offers'],
  },
  {
    id: 'deebo',
    name: 'Deebo',
    role: 'Compliance · Regulation OS',
    status: 'Active',
    description: 'Enforces rule-packs per state, channel, and brand so every touchpoint ships compliant.',
    href: '/dashboard/agents/deebo',
    icon: ShieldCheck,
    tags: ['Compliance', 'Rule Engine'],
  },
];

export function AgentsGrid() {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          return (
            <Card
              key={agent.id}
              className="flex flex-col justify-between border-border/60 bg-background/60 shadow-sm"
            >
              <CardHeader className="space-y-1 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <CardTitle className="text-sm font-semibold leading-none">
                        {agent.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {agent.role}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={agent.status === 'Active' ? 'default' : 'outline'}
                    className="text-[10px] uppercase tracking-wide"
                  >
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-2">
                <p className="text-xs text-muted-foreground">{agent.description}</p>
              </CardContent>

              <CardFooter className="flex items-center justify-between gap-2 pt-2">
                <div className="flex flex-wrap gap-1">
                  {agent.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button asChild size="sm" className="h-7 px-3 text-xs">
                  <Link href={agent.href}>Open</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
