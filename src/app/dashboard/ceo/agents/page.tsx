export const dynamic = 'force-dynamic';
import { AgentsGrid } from '@/components/dashboard/agent-grid';
import { listBrandAgents } from '@/server/actions/agents';
import { allAgents, executiveAgents, agents as supportAgents } from '@/config/agents';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default async function AgentDashboardPage() {
    // For Super Admin view, we fetch the "System" agents which are the global defaults
    // or the agents assigned to the system "brand"
    let dbAgents: any[] = [];
    try {
        dbAgents = await listBrandAgents('system');
    } catch (error) {
        console.error("Failed to load system agents", error);
    }

    // Merge database agents with static config for complete view
    // DB agents take precedence for status/metrics, config provides full list
    const mergedSupportAgents = supportAgents.map(configAgent => {
        const dbAgent = dbAgents.find(db => db.id === configAgent.id);
        return dbAgent ? { ...configAgent, ...dbAgent } : configAgent;
    });

    return (
        <div className="p-8 space-y-8">
            <header className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Agent Command Center</h1>
                <p className="text-muted-foreground">
                    Configure and monitor all AI agents. Super Users have access to the full Executive Board and Support Staff.
                </p>
            </header>

            {/* Executive Board Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Executive Board</h2>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Super User Only
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    C-Suite agents with strategic decision-making authority. Access via the Executive Boardroom.
                </p>
                <AgentsGrid agents={executiveAgents} />
            </section>

            <Separator className="my-8" />

            {/* Support Staff Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">Support Staff</h2>
                    <Badge variant="secondary">Operational Agents</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Specialized agents for day-to-day operations: marketing, analytics, compliance, and customer service.
                </p>
                <AgentsGrid agents={mergedSupportAgents} />
            </section>
        </div>
    );
}
