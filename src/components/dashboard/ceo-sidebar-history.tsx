'use client';

import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useUserRole } from '@/hooks/use-user-role';
import { useEffect } from 'react';

function formatRelativeTime(date: Date | string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
}

export function CeoSidebarHistory() {
    const { sessions, activeSessionId, clearCurrentSession, setActiveSession, setCurrentRole } = useAgentChatStore();
    const { role } = useUserRole();

    useEffect(() => {
        if (role) setCurrentRole(role);
    }, [role, setCurrentRole]);

    const roleSessions = sessions.filter(s => s.role === role);

    return (
        <div className="flex flex-col h-full w-full">
            <div className="p-2">
                <Button
                    onClick={() => clearCurrentSession()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white justify-start gap-2"
                    size="sm"
                >
                    <Plus className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                History
            </div>

            <ScrollArea className="flex-1 px-2">
                <div className="space-y-1 pb-4">
                    {roleSessions.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center py-8">
                            No chat history
                        </p>
                    ) : (
                        roleSessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => setActiveSession(session.id)}
                                className={cn(
                                    "w-full text-left p-2 rounded-md transition-all text-xs group relative",
                                    activeSessionId === session.id
                                        ? "bg-green-50 text-green-700 font-medium border border-green-200"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <span className="truncate block pr-2">{session.title}</span>
                                <div className="flex items-center gap-1 mt-1 opacity-70">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span className="text-[10px]">
                                        {formatRelativeTime(session.timestamp)}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
