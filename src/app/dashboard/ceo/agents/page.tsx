import { fetchAgentLogs } from './actions';
import AgentDashboardClient from './agent-dashboard-client';

export default async function AgentDashboardPage() {
    const logs = await fetchAgentLogs();

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Agent Intelligence Center</h1>
                <p className="text-muted-foreground mt-2">
                    Monitor active implementation of Domain Memory agents. Trigger manual runs and inspect decision logs.
                </p>
            </div>

            <AgentDashboardClient initialLogs={logs} />
        </div>
    );
}
