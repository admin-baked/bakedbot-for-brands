'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { triggerAgentRun, fetchAgentLogs } from './actions';
import { AgentLogEntry } from '@/server/agents/schemas';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgentDashboardClientProps {
    initialLogs?: AgentLogEntry[];
}

export default function AgentDashboardClient({ initialLogs = [] }: AgentDashboardClientProps) {
    const [logs, setLogs] = useState<AgentLogEntry[]>(initialLogs);
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(false);
    const [lastStatus, setLastStatus] = useState<string | null>(null);

    const agents = ['craig', 'smokey', 'pops', 'ezal', 'money_mike', 'mrs_parker'];

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetched = await fetchAgentLogs();
            setLogs(fetched);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch if no logs provided
    useEffect(() => {
        if (initialLogs.length === 0) {
            loadLogs();
        }
    }, [initialLogs.length, loadLogs]);

    const handleRun = (agentName: string) => {
        setLastStatus(`Running ${agentName}...`);
        startTransition(async () => {
            const result = await triggerAgentRun(agentName);
            setLastStatus(result.message);
            // Refresh logs after run
            await loadLogs();
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold font-display text-green-900 dark:text-green-400">Agent Commander</h2>
                    <p className="text-sm text-gray-500">Trigger manual runs and monitor decisions in real-time.</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {agents.map((agent) => (
                    <button
                        key={agent}
                        onClick={() => handleRun(agent)}
                        disabled={isPending}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 capitalize shadow-sm transition-colors"
                    >
                        {isPending && lastStatus?.includes(agent) ? 'Running...' : `Run ${agent.replace('_', ' ')}`}
                    </button>
                ))}
            </div>

            {lastStatus && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded border border-green-200 dark:border-green-800 text-sm">
                    <strong>Status:</strong> {lastStatus}
                </div>
            )}

            <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-950 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-900 border-b">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Timestamp</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Agent</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Action</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Result</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Target ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {logs.length === 0 && !isLoading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No logs found. Run an agent to generate activity.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                                        {typeof log.timestamp === 'string' ? new Date(log.timestamp).toLocaleString() :
                                            log.timestamp instanceof Date ? log.timestamp.toLocaleString() : 'Just now'}
                                    </td>
                                    <td className="px-4 py-2 font-medium capitalize text-green-700 dark:text-green-400">{log.agent_name.replace('_', ' ')}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={log.action}>{log.action}</td>
                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400 max-w-[300px] truncate" title={log.result}>{log.result}</td>
                                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{log.target_id}</td>
                                </tr>
                            ))
                        )}
                        {isLoading && logs.length > 0 && (
                            <tr><td colSpan={5} className="px-4 py-2 text-center text-xs text-muted-foreground animate-pulse">Refreshing data...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

