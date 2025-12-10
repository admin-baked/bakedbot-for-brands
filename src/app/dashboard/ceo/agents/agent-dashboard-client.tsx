'use client';

import { useState, useTransition } from 'react';
import { triggerAgentRun } from './actions';
import { AgentLogEntry } from '@/server/agents/schemas';

interface AgentDashboardClientProps {
    initialLogs: AgentLogEntry[];
}

export default function AgentDashboardClient({ initialLogs }: AgentDashboardClientProps) {
    const [logs, setLogs] = useState<AgentLogEntry[]>(initialLogs);
    const [isPending, startTransition] = useTransition();
    const [lastStatus, setLastStatus] = useState<string | null>(null);

    const agents = ['craig', 'smokey', 'pops', 'ezal', 'money_mike', 'mrs_parker'];

    const handleRun = (agentName: string) => {
        setLastStatus(`Running ${agentName}...`);
        startTransition(async () => {
            const result = await triggerAgentRun(agentName);
            setLastStatus(result.message);
            // In a real app we'd re-fetch logs manually or use a router refresh
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                {agents.map((agent) => (
                    <button
                        key={agent}
                        onClick={() => handleRun(agent)}
                        disabled={isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 capitalize"
                    >
                        Run {agent.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {lastStatus && (
                <div className="p-4 bg-gray-100 dark:bg-zinc-800 rounded border border-gray-200 dark:border-zinc-700">
                    Status: {lastStatus}
                </div>
            )}

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-zinc-900 border-b">
                        <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Agent</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Result</th>
                            <th className="px-4 py-3">Target ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No logs found.</td></tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-4 py-2 opacity-70">
                                        {typeof log.timestamp === 'string' ? new Date(log.timestamp).toLocaleString() :
                                            log.timestamp instanceof Date ? log.timestamp.toLocaleString() : 'Just now'}
                                    </td>
                                    <td className="px-4 py-2 font-medium capitalize">{log.agent_name.replace('_', ' ')}</td>
                                    <td className="px-4 py-2">{log.action}</td>
                                    <td className="px-4 py-2">{log.result}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{log.target_id}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
