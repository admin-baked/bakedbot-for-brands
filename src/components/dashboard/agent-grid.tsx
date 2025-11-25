
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { agents } from '@/config/agents';
import { cn } from '@/lib/utils';

function StatusPill({ status }: { status: 'online' | 'training' | 'paused' }) {
  const label =
    status === 'online' ? 'Online' : status === 'training' ? 'In training' : 'Paused';

  const colorClasses =
    status === 'online'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
      : status === 'training'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
      : 'bg-slate-500/10 text-slate-300 border-slate-500/40';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colorClasses
      )}
    >
      <span
        className={cn(
          'mr-1 h-1.5 w-1.5 rounded-full',
          status === 'online'
            ? 'bg-emerald-400'
            : status === 'training'
            ? 'bg-amber-400'
            : 'bg-slate-400'
        )}
      />
      {label}
    </span>
  );
}

export function AgentGrid() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Your AI dispensary team
          </h2>
          <p className="text-xs text-muted-foreground">
            Each agent owns a slice of the customer journey. Turn them on, align them with your brand, and let them cook.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          Agentic Commerce OS
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => {
          const Icon = agent.icon;

          return (
            <Card
              key={agent.id}
              className="flex flex-col border-border/60 bg-gradient-to-br from-background to-background/60"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{agent.name}</CardTitle>
                    <CardDescription className="text-[11px] leading-tight">
                      {agent.title}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusPill status={agent.status} />
                  {agent.tag ? (
                    <span className="text-[10px] text-muted-foreground">
                      {agent.tag}
                    </span>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3 pb-3">
                <p className="text-xs text-muted-foreground">
                  {agent.description}
                </p>
                <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {agent.primaryMetricLabel}
                  </p>
                  <p className="text-sm font-semibold">{agent.primaryMetricValue}</p>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between gap-3 pt-2">
                <Link
                  href={agent.href}
                  className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                >
                  Configure {agent.name}
                </Link>
                <button
                  type="button"
                  className="rounded-md border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  View activity
                </button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
