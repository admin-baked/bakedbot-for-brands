
import Link from 'next/link';
import { Bot, MessageSquareMore, Mail, LineChart, ShieldCheck, Percent, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AgentEntity } from '@/server/actions/agents';
import { agents as STATIC_AGENT_CONFIG, AgentId } from '@/config/agents';

// Helper to get icon for agent ID
const getIconForAgent = (id: string) => {
  const config = STATIC_AGENT_CONFIG.find(a => a.id === id);
  return config?.icon || Bot;
};

// Helper to get tags for agent ID (since they might not be fully in DB or we want static fallback)
const getTagsForAgent = (id: string) => {
  const config = STATIC_AGENT_CONFIG.find(a => a.id === id);
  return config?.tag ? [config.tag] : ['Agent'];
};

interface AgentsGridProps {
  agents?: AgentEntity[];
}

export function AgentsGrid({ agents }: AgentsGridProps) {
  // Use passed agents (live) or fallback to static config (if not provided, e.g. welcome screen)
  const displayList = agents && agents.length > 0 ? agents : STATIC_AGENT_CONFIG;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayList.map((agent) => {
          const Icon = getIconForAgent(agent.id);
          const tags = getTagsForAgent(agent.id);
          // @ts-ignore - 'title' vs 'role' mismatch in types potentially, but we unified to 'title' in DB. Config uses 'title'.
          // Actually, let's check field names. DB has 'title', Config has 'title'.
          // But wait, previous AgentCard had 'role'. Let's verify field access.

          return (
            <Card
              key={agent.id}
              className="flex flex-col justify-between border-border/60 bg-background/60 shadow-sm transition-all hover:bg-muted/20"
            >
              <CardHeader className="space-y-1 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background">
                      <Icon className="h-4 w-4 text-foreground" />
                    </span>
                    <div className="space-y-0.5">
                      <CardTitle className="text-sm font-semibold leading-none">
                        {agent.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {agent.title || (agent as any).role}
                      </CardDescription>
                    </div>
                  </div>
                  {/* @ts-ignore - status type string mismatch online/active */}
                  <Badge
                    variant={agent.status === 'online' || agent.status === 'Active' ? 'default' : agent.status === 'training' ? 'secondary' : 'outline'}
                    className={`text-[10px] uppercase tracking-wide ${agent.status === 'online' || (agent as any).status === 'Active' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-2">
                <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>

                {/* Metrics Preview */}
                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  <span className="font-medium">{agent.primaryMetricLabel}:</span>
                  <span className="font-bold text-foreground">{agent.primaryMetricValue}</span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between gap-2 pt-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 h-5">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button asChild size="sm" className="h-7 px-3 text-xs w-20">
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
