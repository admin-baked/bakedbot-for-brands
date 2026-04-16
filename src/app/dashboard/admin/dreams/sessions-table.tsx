'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Brain, CheckCircle, XCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import type { DreamSessionRow } from './page';

const AGENT_COLORS: Record<string, string> = {
    linus:       'bg-blue-100 text-blue-800',
    marty:       'bg-purple-100 text-purple-800',
    day_day:     'bg-green-100 text-green-800',
    smokey:      'bg-amber-100 text-amber-800',
    craig:       'bg-pink-100 text-pink-800',
    pops:        'bg-cyan-100 text-cyan-800',
    ezal:        'bg-red-100 text-red-800',
    elroy:       'bg-orange-100 text-orange-800',
    leo:         'bg-indigo-100 text-indigo-800',
    jack:        'bg-teal-100 text-teal-800',
    glenda:      'bg-rose-100 text-rose-800',
    mike_exec:   'bg-slate-100 text-slate-800',
    mrs_parker:  'bg-violet-100 text-violet-800',
    money_mike:  'bg-yellow-100 text-yellow-800',
    deebo:       'bg-zinc-100 text-zinc-800',
    felisha:     'bg-lime-100 text-lime-800',
};

function agentBadge(agentId: string, agentName: string) {
    const cls = AGENT_COLORS[agentId] || 'bg-slate-100 text-slate-700';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
            <Brain className="w-3 h-3" />
            {agentName}
        </span>
    );
}

function formatTime(iso: string) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
        });
    } catch { return iso; }
}

function durationSec(start: string, end?: string) {
    if (!end) return null;
    const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    return s > 0 ? `${s}s` : null;
}

interface HypothesisCardProps {
    h: DreamSessionRow['hypotheses'][number];
}
function HypothesisCard({ h }: HypothesisCardProps) {
    const icon = h.testResult === 'confirmed'
        ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        : h.testResult === 'rejected'
            ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            : <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />;

    const borderColor = h.testResult === 'confirmed'
        ? 'border-green-200 bg-green-50'
        : h.testResult === 'rejected'
            ? 'border-red-200 bg-red-50'
            : 'border-amber-200 bg-amber-50';

    return (
        <div className={`rounded-lg border p-3 text-sm space-y-1.5 ${borderColor}`}>
            <div className="flex items-start gap-2">
                {icon}
                <div>
                    <span className="font-medium">{h.hypothesis}</span>
                    <span className="ml-2 text-xs text-muted-foreground bg-white/60 px-1.5 py-0.5 rounded">{h.area}</span>
                </div>
            </div>
            {h.testEvidence && (
                <p className="text-xs text-muted-foreground pl-6">{h.testEvidence}</p>
            )}
        </div>
    );
}

interface SessionRowProps {
    session: DreamSessionRow;
}
function SessionRow({ session }: SessionRowProps) {
    const [open, setOpen] = useState(false);
    const dur = durationSec(session.startedAt, session.completedAt);

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            {/* Summary row — always visible */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
                {open
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }

                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                    {agentBadge(session.agentId, session.agentName)}
                    <span className="text-xs text-muted-foreground">{formatTime(session.startedAt)}</span>
                    {dur && <span className="text-xs text-muted-foreground">· {dur}</span>}
                    <span className="text-xs text-muted-foreground hidden sm:inline">· {session.model.split(' ')[0]}</span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {session.needsReview && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle className="w-3 h-3" /> Review
                        </span>
                    )}
                    {session.confirmed > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" /> {session.confirmed}
                        </span>
                    )}
                    {session.inconclusive > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                            <HelpCircle className="w-3 h-3" /> {session.inconclusive}
                        </span>
                    )}
                    {session.rejected > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> {session.rejected}
                        </span>
                    )}
                </div>
            </button>

            {/* Expanded detail */}
            {open && (
                <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-4">
                    {/* Introspection stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {[
                            { label: 'Tool Failures', value: session.introspection.toolFailures, warn: session.introspection.toolFailures > 0 },
                            { label: 'Dead-end Loops', value: session.introspection.deadEndLoops, warn: session.introspection.deadEndLoops > 0 },
                            { label: 'Neg. Feedback', value: session.introspection.negativeFeedback, warn: session.introspection.negativeFeedback > 0 },
                            { label: 'QA Failures', value: session.introspection.qaBenchmarkFailures, warn: session.introspection.qaBenchmarkFailures > 0 },
                            { label: 'Pending Deltas', value: session.introspection.pendingDeltas, warn: false },
                            { label: 'Cap. Utilization', value: `${Math.round(session.introspection.capabilityUtilization * 100)}%`, warn: false },
                        ].map(({ label, value, warn }) => (
                            <div key={label} className={`rounded-md p-2 text-center text-xs border ${warn ? 'border-amber-200 bg-amber-50' : 'border-border bg-background'}`}>
                                <div className={`font-bold text-base ${warn ? 'text-amber-700' : 'text-foreground'}`}>{value}</div>
                                <div className="text-muted-foreground leading-tight mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Hypotheses */}
                    {session.hypotheses.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hypotheses</p>
                            {session.hypotheses.map(h => <HypothesisCard key={h.id} h={h} />)}
                        </div>
                    )}

                    {/* Full report */}
                    {session.report && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Slack Report</p>
                            <pre className="text-xs whitespace-pre-wrap bg-background border border-border rounded-md p-3 text-muted-foreground leading-relaxed max-h-48 overflow-y-auto">
                                {session.report}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface Props {
    sessions: DreamSessionRow[];
}

export function DreamSessionsTable({ sessions }: Props) {
    const [filter, setFilter] = useState<'all' | 'review'>('all');

    const agentIds = Array.from(new Set(sessions.map(s => s.agentId))).sort();
    const [agentFilter, setAgentFilter] = useState<string>('all');

    const visible = sessions.filter(s => {
        if (filter === 'review' && !s.needsReview) return false;
        if (agentFilter !== 'all' && s.agentId !== agentFilter) return false;
        return true;
    });

    const reviewCount = sessions.filter(s => s.needsReview).length;
    const confirmedTotal = sessions.reduce((n, s) => n + s.confirmed, 0);

    if (sessions.length === 0) {
        return (
            <Card>
                <CardContent className="py-16 text-center">
                    <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">No dream sessions yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Sessions run nightly at 2 AM ET via <code className="bg-muted px-1 rounded">role-agents-dream-nightly</code> Cloud Scheduler.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
                <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                        <div className="text-2xl font-bold">{sessions.length}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Total Sessions</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{confirmedTotal}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Confirmed Findings</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3 text-center">
                        <div className={`text-2xl font-bold ${reviewCount > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {reviewCount}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Needs Review</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Recent Sessions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground'}`}
                        >
                            All ({sessions.length})
                        </button>
                        <button
                            onClick={() => setFilter('review')}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === 'review' ? 'bg-amber-500 text-white border-amber-500' : 'bg-background text-muted-foreground border-border hover:border-amber-400'}`}
                        >
                            Needs Review ({reviewCount})
                        </button>
                        <span className="border-l border-border mx-1" />
                        <button
                            onClick={() => setAgentFilter('all')}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${agentFilter === 'all' ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-foreground'}`}
                        >
                            All Agents
                        </button>
                        {agentIds.map(id => {
                            const name = sessions.find(s => s.agentId === id)?.agentName || id;
                            const cls = AGENT_COLORS[id] || 'bg-slate-100 text-slate-700';
                            return (
                                <button
                                    key={id}
                                    onClick={() => setAgentFilter(id)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${agentFilter === id ? cls + ' border-transparent' : 'bg-background text-muted-foreground border-border hover:border-foreground'}`}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>

                    {/* Session list */}
                    <div className="space-y-2">
                        {visible.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No sessions match the current filter.</p>
                        ) : (
                            visible.map(s => <SessionRow key={s.id} session={s} />)
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
