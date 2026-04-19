'use client';

import { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import { Mail, MailOpen, RefreshCw, Send, X, Search, MailX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatListTime } from '@/lib/utils/format-time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    refreshEmailThreads,
    loadEmailThread,
    markEmailThreadRead,
    replyToEmailThread,
    closeEmailThread,
} from '@/server/actions/email-inbox';
import type { EmailThread } from '@/types/email-thread';

interface Props {
    initialThreads: EmailThread[];
    isSuperUser: boolean;
    gmailConnected: boolean;
}

const SCOPE_LABELS: Record<string, string> = {
    outreach: 'Outreach',
    org: 'Customer',
    platform: 'Platform',
};

const STATUS_BADGE: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    replied: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    closed: 'bg-muted text-muted-foreground',
};

export function EmailInboxClient({ initialThreads, isSuperUser, gmailConnected }: Props) {
    const [threads, setThreads] = useState<EmailThread[]>(initialThreads);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'replied' | 'open' | 'closed'>('all');
    const [search, setSearch] = useState('');
    const [replyBody, setReplyBody] = useState('');
    const [replyError, setReplyError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isSending, setIsSending] = useState(false);
    const [isLoadingThread, setIsLoadingThread] = useState(false);
    const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const sortedThreads = useMemo(() =>
        [...threads].sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()),
        [threads]
    );

    const filtered = useMemo(() => sortedThreads.filter(t => {
        if (filter !== 'all' && t.status !== filter) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                t.counterpartEmail.toLowerCase().includes(q) ||
                t.subject.toLowerCase().includes(q) ||
                t.messages.some(m => m.preview.toLowerCase().includes(q))
            );
        }
        return true;
    }), [sortedThreads, filter, search]);

    const selected = threads.find(t => t.id === selectedId) ?? null;
    const unreadCount = useMemo(() => threads.filter(t => t.unreadCount > 0).length, [threads]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedId, threads]);

    async function handleSelectThread(id: string) {
        setSelectedId(id);
        setReplyBody('');
        setReplyError(null);
        const thread = threads.find(t => t.id === id);
        if (thread?.unreadCount > 0) {
            startTransition(async () => {
                await markEmailThreadRead(id);
                setThreads(prev => prev.map(t => t.id === id ? { ...t, unreadCount: 0 } : t));
            });
        }
        if (!loadedIds.has(id)) {
            setIsLoadingThread(true);
            const full = await loadEmailThread(id);
            if (full) {
                setThreads(prev => prev.map(t => t.id === id ? full : t));
                setLoadedIds(prev => new Set([...prev, id]));
            }
            setIsLoadingThread(false);
        }
    }

    function handleRefresh() {
        startTransition(async () => {
            const fresh = await refreshEmailThreads();
            setThreads(fresh);
            setLoadedIds(new Set());
        });
    }

    async function handleSendReply() {
        if (!selected || !replyBody.trim()) return;
        setIsSending(true);
        setReplyError(null);
        const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${replyBody.replace(/\n/g, '<br>')}</div>`;
        const result = await replyToEmailThread(
            selected.id,
            selected.counterpartEmail,
            selected.subject,
            html,
            selected.bakedBotEmail,
        );
        setIsSending(false);
        if (result.error) {
            setReplyError(result.error);
            return;
        }
        setReplyBody('');
        // Optimistic update: append outbound message to thread
        setThreads(prev => prev.map(t => {
            if (t.id !== selected.id) return t;
            return {
                ...t,
                status: 'open',
                lastActivityAt: new Date() as unknown as Date,
                messages: [...t.messages, {
                    id: `temp-${Date.now()}`,
                    direction: 'outbound' as const,
                    from: t.bakedBotEmail,
                    to: t.counterpartEmail,
                    subject: t.subject,
                    preview: replyBody.slice(0, 500),
                    htmlBody: html,
                    sentAt: new Date() as unknown as Date,
                }],
            };
        }));
    }

    function handleClose() {
        if (!selected) return;
        startTransition(async () => {
            await closeEmailThread(selected.id);
            setThreads(prev => prev.map(t => t.id === selected.id ? { ...t, status: 'closed' } : t));
        });
    }

    if (!gmailConnected) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-sm px-6">
                    <MailX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="font-semibold text-base mb-2">Gmail not connected</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Connect your Gmail account to send and receive email threads.
                    </p>
                    <Button asChild size="sm">
                        <a href="/dashboard/settings?tab=integrations">Connect Gmail</a>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 overflow-hidden">
            {/* Thread list sidebar */}
            <div className="w-72 xl:w-80 flex-shrink-0 border-r border-border flex flex-col">
                {/* Header */}
                <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm">Email Inbox</span>
                        {unreadCount > 0 && (
                            <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-medium leading-none">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-3 py-2 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search threads…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex border-b border-border text-xs">
                    {(['all', 'open', 'replied', 'closed'] as const).map(f => (
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
                            {search ? 'No results found.' : 'No threads yet.'}
                        </div>
                    ) : (
                        filtered.map(thread => {
                            const lastMsg = thread.messages[thread.messages.length - 1];
                            const hasUnread = thread.unreadCount > 0;
                            return (
                                <button
                                    key={thread.id}
                                    onClick={() => handleSelectThread(thread.id)}
                                    className={cn(
                                        'w-full text-left px-3 py-3 border-b border-border hover:bg-muted/50 transition-colors',
                                        selectedId === thread.id && 'bg-muted',
                                        hasUnread && 'bg-blue-50/60 dark:bg-blue-950/20'
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
                                            {formatListTime(thread.lastActivityAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-foreground mt-0.5 truncate font-medium">
                                        {thread.subject}
                                    </p>
                                    <div className="flex items-center justify-between mt-1.5 gap-1">
                                        <p className="text-[11px] text-muted-foreground truncate flex-1">
                                            {lastMsg?.preview?.slice(0, 55) ?? '—'}
                                        </p>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {isSuperUser && (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1 py-0">
                                                    {SCOPE_LABELS[thread.scope] ?? thread.scope}
                                                </Badge>
                                            )}
                                            <Badge className={cn('text-[9px] h-4 px-1.5 py-0 border-0', STATUS_BADGE[thread.status])}>
                                                {thread.status}
                                            </Badge>
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
                        <div className="px-6 py-3.5 border-b border-border flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 flex-wrap">
                                    <span className="font-medium text-foreground">{selected.counterpartEmail}</span>
                                    <span>→</span>
                                    <span className="font-medium text-foreground">{selected.bakedBotEmail}</span>
                                    {selected.dispensaryName && <span className="text-muted-foreground">· {selected.dispensaryName}</span>}
                                </div>
                                <h2 className="font-semibold text-sm truncate">{selected.subject}</h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Badge className={cn('text-[10px] h-4 px-1.5 border-0', STATUS_BADGE[selected.status])}>
                                        {selected.status}
                                    </Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                        {selected.messages.length} message{selected.messages.length !== 1 ? 's' : ''}
                                    </span>
                                    {selected.agentName && (
                                        <span className="text-[11px] text-muted-foreground">· via {selected.agentName}</span>
                                    )}
                                </div>
                            </div>
                            {selected.status !== 'closed' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClose}
                                    disabled={isPending}
                                    className="text-xs shrink-0"
                                >
                                    Close thread
                                </Button>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            {isLoadingThread ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : selected.messages.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No messages in this thread.</p>
                            ) : null}
                            {!isLoadingThread && selected.messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        'rounded-lg p-4 text-sm',
                                        msg.direction === 'outbound'
                                            ? 'bg-muted ml-6 max-w-2xl'
                                            : 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 max-w-2xl'
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn(
                                                'text-[9px] h-4 px-1.5 border-0',
                                                msg.direction === 'outbound'
                                                    ? 'bg-muted-foreground/20 text-muted-foreground'
                                                    : 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                            )}>
                                                {msg.direction === 'outbound' ? 'Sent' : 'Reply'}
                                            </Badge>
                                            <span className="text-xs font-medium truncate">{msg.from}</span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground shrink-0">
                                            {formatListTime(msg.sentAt)}
                                        </span>
                                    </div>
                                    {msg.direction === 'outbound' && msg.htmlBody ? (
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_a]:text-primary"
                                            dangerouslySetInnerHTML={{ __html: msg.htmlBody }}
                                        />
                                    ) : (
                                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                            {msg.preview}
                                        </p>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply composer */}
                        {selected.status !== 'closed' && (
                            <div className="shrink-0 border-t border-border px-6 py-4 bg-background/95">
                                {replyError && (
                                    <p className="text-xs text-destructive mb-2">{replyError}</p>
                                )}
                                <textarea
                                    value={replyBody}
                                    onChange={e => setReplyBody(e.target.value)}
                                    placeholder={`Reply to ${selected.counterpartEmail}…`}
                                    rows={3}
                                    className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                                />
                                <div className="flex items-center justify-end gap-2 mt-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSendReply}
                                        disabled={!replyBody.trim() || isSending}
                                    >
                                        <Send className="h-3.5 w-3.5 mr-1.5" />
                                        {isSending ? 'Sending…' : 'Send reply'}
                                    </Button>
                                </div>
                            </div>
                        )}
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
