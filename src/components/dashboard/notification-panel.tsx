'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    CheckCheck, X, Loader2, ExternalLink, Bell,
} from 'lucide-react';
import {
    getNotifications, markNotificationRead, markAllRead,
    dismissNotification, getUnreadCount,
} from '@/server/actions/agent-notifications';
import type { AgentNotification } from '@/types/agent-notification';
import { NOTIFICATION_TYPE_INFO, NOTIFICATION_PRIORITY_INFO } from '@/types/agent-notification';

// Agent display names/emojis (lightweight)
const AGENT_EMOJI: Record<string, string> = {
    smokey: '🌿', craig: '📣', ezal: '👁️', deebo: '🛡️',
    money_mike: '💰', mrs_parker: '💜', pops: '📊', day_day: '🔍',
    leo: '⚙️', linus: '🔧', jack: '🤝', glenda: '✨',
    openclaw: '🦀', felisha: '👋', big_worm: '🐛', roach: '🪳',
    puff: '💨', general: '🤖', mike_exec: '💼',
};

interface NotificationPanelProps {
    onClose: () => void;
    onCountChange: (count: number) => void;
}

export function NotificationPanel({ onClose, onCountChange }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<AgentNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    async function loadNotifications() {
        setLoading(true);
        const result = await getNotifications({ limit: 30 });
        setNotifications(result);
        setLoading(false);
    }

    async function handleMarkRead(id: string) {
        await markNotificationRead(id);
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
        );
        const count = await getUnreadCount();
        onCountChange(count);
    }

    async function handleDismiss(id: string) {
        await dismissNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        const count = await getUnreadCount();
        onCountChange(count);
    }

    async function handleMarkAllRead() {
        await markAllRead();
        setNotifications(prev =>
            prev.map(n => n.status === 'unread' ? { ...n, status: 'read' as const } : n)
        );
        onCountChange(0);
    }

    function formatRelativeTime(date: Date): string {
        const now = Date.now();
        const d = new Date(date).getTime();
        const diff = now - d;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    const unreadCount = notifications.filter(n => n.status === 'unread').length;

    return (
        <div className="absolute right-0 top-full mt-2 w-96 bg-popover border rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {unreadCount} new
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-7">
                            <CheckCheck className="h-3.5 w-3.5 mr-1" />
                            Mark all read
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Notification list */}
            <ScrollArea className="max-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                        <p className="text-xs text-muted-foreground">
                            Agent updates will appear here
                        </p>
                    </div>
                ) : (
                    <div>
                        {notifications.map(notification => {
                            const typeInfo = NOTIFICATION_TYPE_INFO[notification.type];
                            const priorityInfo = NOTIFICATION_PRIORITY_INFO[notification.priority];
                            const emoji = AGENT_EMOJI[notification.agent] || '🤖';
                            const agentName = notification.agent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                            return (
                                <div
                                    key={notification.id}
                                    className={`px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                                        notification.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                                    }`}
                                    onClick={() => {
                                        if (notification.status === 'unread') {
                                            handleMarkRead(notification.id);
                                        }
                                        if (notification.actionUrl) {
                                            window.location.href = notification.actionUrl;
                                            onClose();
                                        }
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Priority indicator */}
                                        <div className={`w-1 h-full min-h-[40px] rounded-full shrink-0 ${
                                            notification.priority === 'urgent' ? 'bg-red-500' :
                                            notification.priority === 'high' ? 'bg-orange-500' :
                                            notification.priority === 'medium' ? 'bg-blue-500' :
                                            'bg-gray-300'
                                        }`} />

                                        <div className="flex-1 min-w-0">
                                            {/* Agent + time */}
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {emoji} {agentName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatRelativeTime(notification.createdAt)}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <p className={`text-sm ${notification.status === 'unread' ? 'font-semibold' : ''}`}>
                                                {notification.title}
                                            </p>

                                            {/* Message */}
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                                {notification.message}
                                            </p>

                                            {/* Action */}
                                            {notification.actionUrl && notification.actionLabel && (
                                                <span className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
                                                    {notification.actionLabel}
                                                    <ExternalLink className="h-3 w-3" />
                                                </span>
                                            )}
                                        </div>

                                        {/* Dismiss */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDismiss(notification.id);
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
