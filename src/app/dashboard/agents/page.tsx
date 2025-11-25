
import type { Metadata } from 'next';
import { AgentsGrid } from '@/components/dashboard/agent-grid';

export const metadata: Metadata = {
  title: 'Agents | BakedBot AI',
};

export default function AgentsPage() {
  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Orchestrate Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, and Deebo from a single
          command center.
        </p>
      </header>

      <AgentsGrid />
    </main>
  );
}
