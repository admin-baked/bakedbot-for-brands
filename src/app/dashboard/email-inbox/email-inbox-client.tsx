'use client';

import { useState } from 'react';
import { Mail, MailOpen, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailThread } from '@/types/email-thread';

interface Props {
    initialThreads: EmailThread[];
    isSuperUser: boolean;
}

const SCOPE_LABELS: Record<string, string> = {
    outreach: 'Outreach (Dispensaries)',
    org: 'Customer Replies',
    platform: 'Platform',
};

const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-500',
    replied: 'bg-emerald-500',
    closed: 'bg-gray-400',
};

function formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffHrs < 168) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function EmailInboxClient({ initialThreads, isSuperUser }: Props) {
    const [threads] = useState<EmailThread[]>(initialThreads);
    const [selectedId, setSelectedId] = useState<string | null>(
        initialThreads[0]?.id ?? null
    );
    const [filter, setFilter] = useState<'all' | 'replied' | 'open'>('all');

    const filtered = threads.filter(t =>
        filter === 'all' ? true : t.status === filter
    );

    const selected = threads.find(t => t.id === selectedId);
    const repliedCount = threads.filter(t => t.status === 'replied' && t.unreadCount > 0).length;

    return (
        <div className="flex h-full min-h-0 overflow-hidden">
            {/* Thread list */}
            <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">Email Inbox</span>
                        {repliedCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">
                                {repliedCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                        title="Refresh"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex border-b border-border text-xs">
                    {(['all', 'replied', 'open'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                'flex-1 py-2 capitalize transition-colors',
                                filter === f
                                    ? 'text-primary border-b-2 border-primary font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Thread items */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            No threads yet. Replies will appear here.
                        </div>
                    ) : (
                        filtered.map(thread => {
                            const lastMsg = thread.messages[thread.messages.length - 1];
                            const hasUnread = thread.unreadCount > 0;
                            return (
                                <button
                                    key={thread.id}
                                    onClick={() => setSelectedId(thread.id)}
                                    className={cn(
                                        'w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors',
                                        selectedId === thread.id && 'bg-muted',
                                        hasUnread && 'bg-blue-50 dark:bg-blue-950/20'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {hasUnread
                                                ? <MailOpen className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                                : <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            }
                                            <span className={cn('text-xs font-medium truncate', hasUnread && 'text-blue-600 dark:text-blue-400')}>
                                                {thread.counterpartEmail}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                            {formatDate(thread.lastActivityAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground mt-0.5 truncate font-medium">
                                        {thread.subject}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                        <p className="text-[11px] text-muted-foreground truncate flex-1">
                                            {lastMsg?.preview?.slice(0, 60) ?? '—'}
                                        </p>
                                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                            {isSuperUser && (
                                                <span className={cn(
                                                    'text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium',
                                                    thread.scope === 'outreach' ? 'bg-violet-500' : 'bg-teal-500'
                                                )}>
                                                    {SCOPE_LABELS[thread.scope] ?? thread.scope}
                                                </span>
                                            )}
                                            <span className={cn(
                                                'h-1.5 w-1.5 rounded-full',
                                                STATUS_COLORS[thread.status]
                                            )} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Thread detail */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {selected ? (
                    <>
                        {/* Thread header */}
                        <div className="px-6 py-4 border-b border-border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <span>From:</span>
                                <span className="font-medium text-foreground">{selected.counterpartEmail}</span>
                                <span className="mx-1">·</span>
                                <span>To:</span>
                                <span className="font-medium text-foreground">{selected.bakedBotEmail}</span>
                                {selected.dispensaryName && (
                                    <>
                                        <span className="mx-1">·</span>
                                        <span>{selected.dispensaryName}</span>
                                    </>
                                )}
                            </div>
                            <h2 className="font-semibold text-base">{selected.subject}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                    'text-xs px-2 py-0.5 rounded-full text-white font-medium',
                                    STATUS_COLORS[selected.status]
                                )}>
                                    {selected.status}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {selected.messages.length} message{selected.messages.length !== 1 ? 's' : ''}
                                </span>
                                {selected.agentName && (
                                    <span className="text-xs text-muted-foreground">· via {selected.agentName}</span>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            {selected.messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        'rounded-lg p-4 text-sm max-w-2xl',
                                        msg.direction === 'outbound'
                                            ? 'bg-muted ml-8'
                                            : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded',
                                                msg.direction === 'outbound'
                                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                    : 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                                            )}>
                                                {msg.direction === 'outbound' ? 'Sent' : 'Reply'}
                                            </span>
                                            <span className="text-xs font-medium">{msg.from}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(msg.sentAt)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                        {msg.preview}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                        Select a thread to read
                    </div>
                )}
            </div>
        </div>
    );
}
