'use client';

/**
 * ExecutiveProactiveCheckArtifact
 *
 * Renders the executive intelligence brief produced by the 9 AM proactive cron.
 * Shows: header with date, per-agent recommendation cards in a 2-col grid,
 * and a context footer with meeting count + email unread count.
 */

import React from 'react';
import { Clock, Calendar, Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ============ Local Types ============

interface ExecMeeting {
    startTime: string;
    title: string;
    attendee?: string;
}

interface ExecEmailDigest {
    unreadCount: number;
    topEmails: Array<{ subject: string; from: string }>;
}

interface ExecRecommendation {
    agent: 'leo' | 'jack' | 'glenda' | 'linus' | 'mike' | 'mrs_parker';
    title: string;
    items: string[];
    urgency: 'clean' | 'info' | 'warning' | 'critical';
}

export interface ExecProactiveCheckData {
    date: string;           // "2026-03-04"
    dateLabel: string;      // "Wednesday, March 4"
    meetings: ExecMeeting[];
    emailDigest?: ExecEmailDigest;
    executiveRecommendations: ExecRecommendation[];
    generatedAt: string;    // ISO timestamp
}

// ============ Config Maps ============

const AGENT_CONFIG: Record<ExecRecommendation['agent'], {
    label: string;
    avatarBg: string;
    avatarText: string;
    initial: string;
}> = {
    leo:       { label: "Leo's Operational Priorities",   avatarBg: 'bg-blue-500/20',   avatarText: 'text-blue-400',   initial: 'L' },
    jack:      { label: "Jack's Revenue Focus",           avatarBg: 'bg-orange-500/20', avatarText: 'text-orange-400', initial: 'J' },
    glenda:    { label: "Glenda's Marketing Pulse",       avatarBg: 'bg-pink-500/20',   avatarText: 'text-pink-400',   initial: 'G' },
    linus:     { label: "Linus's Tech Watch",             avatarBg: 'bg-purple-500/20', avatarText: 'text-purple-400', initial: 'Li' },
    mike:      { label: "Mike's Financial Lens",          avatarBg: 'bg-green-500/20',  avatarText: 'text-green-400',  initial: 'M' },
    mrs_parker: { label: "Mrs. Parker's Customer Health", avatarBg: 'bg-rose-500/20',   avatarText: 'text-rose-400',   initial: 'P' },
};

const URGENCY_CONFIG: Record<ExecRecommendation['urgency'], {
    label: string;
    className: string;
}> = {
    critical: { label: 'Critical',       className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    warning:  { label: 'Needs Attention', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    info:     { label: 'FYI',            className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    clean:    { label: 'All Clear',      className: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

const MAX_ITEMS_SHOWN = 4;

// ============ Sub-components ============

function AgentCard({ rec }: { rec: ExecRecommendation }) {
    const agent = AGENT_CONFIG[rec.agent];
    const urgency = URGENCY_CONFIG[rec.urgency];
    const visibleItems = rec.items.slice(0, MAX_ITEMS_SHOWN);
    const overflowCount = rec.items.length - MAX_ITEMS_SHOWN;

    return (
        <div className="p-3 rounded-lg bg-white/5 border border-white/8 space-y-2">
            {/* Card Header */}
            <div className="flex items-center gap-2">
                {/* Avatar */}
                <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                    agent.avatarBg,
                    agent.avatarText
                )}>
                    {agent.initial}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{agent.label}</p>
                </div>
                <Badge
                    variant="outline"
                    className={cn('text-[10px] font-medium shrink-0 px-1.5 py-0', urgency.className)}
                >
                    {urgency.label}
                </Badge>
            </div>

            {/* Recommendation Items */}
            <ul className="space-y-1">
                {visibleItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className={cn(
                            'h-1 w-1 rounded-full shrink-0 mt-1.5',
                            rec.urgency === 'critical' ? 'bg-red-400' :
                            rec.urgency === 'warning'  ? 'bg-amber-400' :
                            rec.urgency === 'info'     ? 'bg-blue-400' :
                            'bg-green-400'
                        )} />
                        <span>{item}</span>
                    </li>
                ))}
                {overflowCount > 0 && (
                    <li className="text-[10px] text-muted-foreground/60 pl-3">
                        + {overflowCount} more
                    </li>
                )}
            </ul>
        </div>
    );
}

function formatGeneratedAt(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
        return '';
    }
}

// ============ Main Export ============

export function ExecutiveProactiveCheckArtifact({ data }: { data: ExecProactiveCheckData }) {
    const { dateLabel, meetings, emailDigest, executiveRecommendations, generatedAt } = data;
    const timeLabel = formatGeneratedAt(generatedAt);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="font-semibold text-sm leading-snug">
                        Executive Intelligence Brief
                    </h3>
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                </div>
                {timeLabel && (
                    <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{timeLabel}</span>
                    </div>
                )}
            </div>

            {/* Agent Recommendation Cards — 2-col grid */}
            {executiveRecommendations.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {executiveRecommendations.map((rec, i) => (
                        <AgentCard key={i} rec={rec} />
                    ))}
                </div>
            )}

            {/* Context Footer */}
            <div className="flex items-center gap-4 pt-1 border-t border-white/5">
                {meetings.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                            {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'} today
                        </span>
                    </div>
                )}
                {emailDigest && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{emailDigest.unreadCount} unread</span>
                    </div>
                )}
            </div>
        </div>
    );
}
