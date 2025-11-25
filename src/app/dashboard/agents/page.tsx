
import { agents } from '@/config/agents';
import { AgentGrid } from '@/components/dashboard/agent-grid';

export const metadata = {
  title: 'Agents | BakedBot AI',
};

export default function AgentsPage() {
  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Configure the AI team running your menus, campaigns, analytics, and compliance checks.
        </p>
      </header>

      <AgentGrid />

      <p className="text-[11px] text-muted-foreground">
        Coming soon: per-agent timelines, logs, and sandbox test consoles.
      </p>
    </main>
  );
}
