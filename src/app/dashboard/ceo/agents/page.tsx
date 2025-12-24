import { AgentsGrid } from '@/components/dashboard/agent-grid';
import { listBrandAgents } from '@/server/actions/agents';

export default async function AgentDashboardPage() {
    // For Super Admin view, we fetch the "System" agents which are the global defaults
    // or the agents assigned to the system "brand"
    let agents: any[] = [];
    try {
        agents = await listBrandAgents('system');
    } catch (error) {
        console.error("Failed to load system agents", error);
    }

    return (
        <div className="p-8 space-y-8">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
                <p className="text-muted-foreground">
                    Configure and monitor your AI agents. Orchestrate Smokey, Craig, Pops, Ezal, Money Mike, Mrs. Parker, and Deebo from a single command center.
                </p>
            </header>

            <AgentsGrid agents={agents} />
        </div>
    );
}
