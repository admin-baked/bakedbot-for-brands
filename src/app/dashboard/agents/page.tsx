import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
import { AgentsGrid } from '@/components/dashboard/agent-grid';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { listBrandAgents } from '@/server/actions/agents';

export const metadata: Metadata = {
  title: 'Agents | BakedBot AI',
};

export default async function AgentsPage() {
  let agents = [];
  try {
    const user = await requireUser(['brand', 'super_user', 'dispensary']);
    // Assuming simple mapping for now. In reality, we might need a separate call to get the active brand ID if not in token.
    // For single-brand owners:
    const brandId = user.uid; // Mapping user ID to brand ID for now as per project convention, or we'd fetch the specific brand profile.

    // Ideally we would fetch the specific "active" brand if the user has multiple. 
    // Given current context, using UID as brandId serves the primary use case for "owner".
    agents = await listBrandAgents(brandId);
  } catch (error) {
    // If not authorized or error, redirect is handled by middleware/requireUser usually, 
    // but here we might just show empty or redirect.
    console.error("Failed to load agents", error);
    redirect('/dashboard');
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="text-sm text-muted-foreground">
          Orchestrate Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, and Deebo from a single
          command center.
        </p>
      </header>

      <AgentsGrid agents={agents} />
    </main>
  );
}
