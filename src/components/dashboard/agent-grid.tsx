
import Link from 'next/link';
import { Bot } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { agents as STATIC_AGENT_CONFIG, type AgentDefinition } from '@/lib/agents/registry';
import type { AgentEntity } from '@/server/actions/agents';

// Unified agent type for display (accepts both DB entities and static config)
type DisplayAgent = AgentEntity | AgentDefinition;

interface AgentsGridProps {
  agents?: DisplayAgent[];
}

export function AgentsGrid({ agents }: AgentsGridProps) {
  // Use passed agents (live) or fallback to static config
  const displayList = agents && agents.length > 0 ? agents : STATIC_AGENT_CONFIG;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {displayList.map((agent) => {
          const Icon = 'icon' in agent ? agent.icon : Bot;
          const tag = 'tag' in agent ? agent.tag : 'Agent';

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
                        {agent.title}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={agent.status === 'online' ? 'default' : agent.status === 'training' ? 'secondary' : 'outline'}
                    className={`text-[10px] uppercase tracking-wide ${agent.status === 'online' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    {agent.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pb-2">
                <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>

                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  <span className="font-medium">{agent.primaryMetricLabel}:</span>
                  <span className="font-bold text-foreground">{agent.primaryMetricValue}</span>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between gap-2 pt-2">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                    {tag}
                  </Badge>
                </div>
                <Button asChild size="sm" className="h-7 px-3 text-xs w-20">
                  <Link href={'href' in agent ? agent.href : `/dashboard/agents/${agent.id}`}>Open</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
