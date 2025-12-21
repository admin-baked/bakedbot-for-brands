'use client';

import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
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

export function SharedSidebarHistory() {
    const { sessions, activeSessionId, clearCurrentSession, setActiveSession, setCurrentRole } = useAgentChatStore();
    const router = useRouter();
    const pathname = usePathname();
    const { role } = useUserRole();

    // Ensure store knows current role
    useEffect(() => {
        if (role) setCurrentRole(role);
    }, [role, setCurrentRole]);

    // Filter sessions by current role
    const roleSessions = sessions.filter(s => s.role === role);

    const handleNewChat = () => {
        clearCurrentSession();
        // Brand chat is on the main dashboard overview
        if (role === 'brand') {
            if (pathname !== '/dashboard') {
                router.push('/dashboard');
            }
        } else {
            // Default/Super User chat is in playbooks (or specific chat view)
            if (pathname !== '/dashboard/playbooks') {
                router.push('/dashboard/playbooks');
            }
        }
    };

    const handleSelectSession = (sessionId: string) => {
        setActiveSession(sessionId);
        if (role === 'brand') {
            if (pathname !== '/dashboard') {
                router.push('/dashboard');
            }
        } else {
            if (pathname !== '/dashboard/playbooks') {
                router.push('/dashboard/playbooks');
            }
        }
    };

    return (
        <div className="flex flex-col w-full mb-4">
            <div className="px-2 mb-2">
                <Button
                    onClick={handleNewChat}
                    className="w-full bg-green-600 hover:bg-green-700 text-white justify-start gap-2 shadow-sm"
                    size="sm"
                >
                    <Plus className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            <div className="px-4 py-2 text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-2 tracking-wider">
                <Clock className="h-3 w-3" />
                Recent History
            </div>

            <div className="px-2">
                <div className="space-y-0.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {roleSessions.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground text-center py-2 italic opacity-60">
                            No recent chats
                        </p>
                    ) : (
                        roleSessions.slice(0, 5).map(session => (
                            <button
                                key={session.id}
                                onClick={() => handleSelectSession(session.id)}
                                className={cn(
                                    "w-full text-left px-2 py-1.5 rounded-md transition-all text-xs group flex flex-col gap-0.5",
                                    activeSessionId === session.id
                                        ? "bg-green-50 text-green-700 border border-green-200"
                                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-transparent"
                                )}
                            >
                                <span className="truncate block font-medium w-full">{session.title}</span>
                                <span className="text-[9px] opacity-70">
                                    {formatRelativeTime(session.timestamp)}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
            <div className="mx-4 mt-2 mb-2 border-b border-border/40" />
        </div>
    );
}
