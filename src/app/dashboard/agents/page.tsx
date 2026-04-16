import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';

import { AgentsGrid } from '@/components/dashboard/agent-grid';
import { DreamSessionsTable } from '@/app/dashboard/admin/dreams/sessions-table';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { listBrandAgents } from '@/server/actions/agents';
import { fetchDreamSessions } from '@/lib/dream-sessions';
import Link from 'next/link';
import { Brain, Bot } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agents | BakedBot AI',
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AgentsPage({ searchParams }: Props) {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser(['brand', 'super_user', 'dispensary']);
  } catch {
    redirect('/dashboard');
  }

  const isSuperUser = (user as { role?: string }).role === 'super_user';
  const params = await searchParams;
  const tab = Array.isArray(params.tab) ? params.tab[0] : (params.tab ?? 'agents');
  const activeTab = tab === 'dreams' && isSuperUser ? 'dreams' : 'agents';

  const brandId = user.uid;
  const [agents, dreamSessions] = await Promise.all([
    listBrandAgents(brandId).catch(() => []),
    activeTab === 'dreams' ? fetchDreamSessions(150) : Promise.resolve([]),
  ]);

  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Orchestrate Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, and Deebo from a single
          command center.
        </p>
      </header>

      {/* Tab bar — Dreams only visible to super_user */}
      {isSuperUser && (
        <div className="flex gap-1 border-b border-border">
          <Link
            href="/dashboard/agents"
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'agents'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            Agents
          </Link>
          <Link
            href="/dashboard/agents?tab=dreams"
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'dreams'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Dreams
          </Link>
        </div>
      )}

      {activeTab === 'dreams' ? (
        <DreamSessionsTable sessions={dreamSessions} />
      ) : (
        <AgentsGrid agents={agents} />
      )}
    </main>
  );
}
