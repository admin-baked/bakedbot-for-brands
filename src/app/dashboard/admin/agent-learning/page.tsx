/**
 * Agent Learning Loop Dashboard
 *
 * Server component — shows each agent's learning state:
 * trend, week summary, recent metrics, next hypothesis, and feedback approval rate.
 */

import { getAllAgentLearningDocs, type AgentLearningDoc, type AgentRunMetrics } from '@/server/services/agent-performance';
import { getAgentFeedbackSummary } from '@/server/services/agent-learning-loop';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TREND_CONFIG: Record<AgentLearningDoc['performanceTrend'], { pill: string; label: string }> = {
    improving: { pill: 'bg-green-100 text-green-700 border-green-200',  label: '🟢 Improving' },
    stable:    { pill: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '🟡 Stable' },
    declining: { pill: 'bg-red-100 text-red-700 border-red-200',        label: '🔴 Declining' },
    unknown:   { pill: 'bg-gray-100 text-gray-500 border-gray-200',     label: '⚪ Unknown' },
};

function firstThreeMetrics(metrics: AgentRunMetrics): [string, string][] {
    return Object.entries(metrics)
        .slice(0, 3)
        .map(([k, v]) => [k.replace(/_/g, ' '), String(v ?? '—')]);
}

function agentDisplayName(agentId: string): string {
    const MAP: Record<string, string> = {
        marty: 'Marty',
        linus: 'Linus',
        leo: 'Leo',
        craig: 'Craig',
        ezal: 'Ezal',
        deebo: 'Deebo',
        elroy: 'Elroy',
        smokey: 'Smokey',
        glenda: 'Glenda',
        jack: 'Jack',
        mike: 'Mike',
        pops: 'Pops',
        roach: 'Roach',
        felisha: 'Felisha',
        mrs_parker: 'Mrs. Parker',
    };
    return MAP[agentId] ?? agentId;
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

interface AgentCardProps {
    doc: AgentLearningDoc;
    approvalRate: number;
    feedbackTotal: number;
}

function AgentCard({ doc, approvalRate, feedbackTotal }: AgentCardProps) {
    const trend = TREND_CONFIG[doc.performanceTrend] ?? TREND_CONFIG.unknown;
    const metrics = firstThreeMetrics(doc.recentMetrics ?? {});
    const hasPending = (doc.pendingApprovals?.length ?? 0) > 0;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-base font-semibold text-slate-900 truncate">
                        {agentDisplayName(doc.agentId)}
                    </span>
                    <span className="inline-block text-[11px] font-medium text-slate-500 bg-slate-100 rounded px-2 py-0.5 w-fit truncate">
                        {doc.domain}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {hasPending && (
                        <span className="text-[11px] font-semibold bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                            {doc.pendingApprovals.length} pending
                        </span>
                    )}
                    <span className={`text-[11px] font-medium border rounded-full px-2.5 py-0.5 ${trend.pill}`}>
                        {trend.label}
                    </span>
                </div>
            </div>

            {/* Week summary */}
            {doc.weekSummary && (
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                    {doc.weekSummary}
                </p>
            )}

            {/* Recent metrics */}
            {metrics.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {metrics.map(([key, val]) => (
                        <div key={key} className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 text-center">
                            <div className="text-xs font-semibold text-slate-800 truncate">{val}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate capitalize">{key}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Next hypothesis */}
            {doc.nextHypothesis && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                    <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">Testing next:</span>
                    <p className="text-xs text-blue-800 mt-0.5 line-clamp-2">{doc.nextHypothesis}</p>
                </div>
            )}

            {/* Footer: approval rate */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                    {feedbackTotal > 0 ? `${approvalRate}% approval` : 'No feedback yet'}
                    {feedbackTotal > 0 && <span className="text-slate-300 ml-1">({feedbackTotal} rated)</span>}
                </span>
                <span className="text-[10px] text-slate-300">
                    Updated {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AgentLearningPage() {
    const docs = await getAllAgentLearningDocs();

    // Fetch feedback summaries for all agents in parallel
    const feedbackResults = await Promise.all(
        docs.map(doc => getAgentFeedbackSummary(doc.agentId, 7)),
    );

    return (
        <div className="flex flex-col h-full">
            {/* Page header */}
            <div className="px-6 py-4 border-b bg-white">
                <h1 className="text-lg font-semibold text-slate-900">Agent Learning Loop</h1>
                <p className="text-sm text-slate-500">How each agent improves over time</p>
            </div>

            <div className="flex-1 overflow-auto p-6">
                {docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <p className="text-slate-400 text-sm">No learning data yet.</p>
                        <p className="text-slate-300 text-xs mt-1">
                            Agents will populate this as they run.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {docs.map((doc, i) => {
                            const fb = feedbackResults[i];
                            return (
                                <AgentCard
                                    key={`${doc.agentId}__${doc.domain}`}
                                    doc={doc}
                                    approvalRate={fb.approvalRate}
                                    feedbackTotal={fb.total}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer legend */}
            <div className="px-6 py-2 border-t bg-slate-50 flex gap-4 text-xs text-slate-400">
                {Object.values(TREND_CONFIG).map(t => (
                    <span key={t.label}>{t.label}</span>
                ))}
                <span className="ml-auto">{docs.length} agent{docs.length !== 1 ? 's' : ''} tracked</span>
            </div>
        </div>
    );
}
