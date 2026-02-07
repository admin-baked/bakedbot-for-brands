'use client';

/**
 * Shared Sidebar History
 *
 * Shows unified recent history from both inbox threads and playbook sessions.
 * Includes filter toggle (All / Inbox / Playbooks) for mixed view.
 */

import { useUnifiedHistory, HistorySource } from '@/hooks/use-unified-history';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { Button } from '@/components/ui/button';
import { Plus, Clock, Inbox, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import { formatSmartTime } from '@/lib/utils/format-time';
import { useEffect } from 'react';

export function SharedSidebarHistory() {
    const router = useRouter();
    const pathname = usePathname();
    const { role } = useUserRole();

    const { items, activeItemId, isEmpty, filter, setFilter, counts } = useUnifiedHistory({
        role,
        maxItems: 5,
    });

    const { clearCurrentSession, setActiveSession, setCurrentRole } = useAgentChatStore();
    const { setActiveThread } = useInboxStore();

    // Ensure store knows current role
    useEffect(() => {
        if (role) setCurrentRole(role);
    }, [role, setCurrentRole]);

    // Check if user is business role (brand/dispensary)
    const isBusinessUser =
        role === 'brand' ||
        role === 'brand_admin' ||
        role === 'brand_member' ||
        role === 'dispensary' ||
        role === 'dispensary_admin' ||
        role === 'dispensary_staff' ||
        role === 'budtender';

    const handleNewChat = () => {
        clearCurrentSession();
        setActiveThread(null);

        if (isBusinessUser) {
            if (pathname !== '/dashboard/inbox') {
                router.push('/dashboard/inbox');
            }
        } else {
            if (pathname !== '/dashboard/playbooks') {
                router.push('/dashboard/playbooks');
            }
        }
    };

    const handleSelectItem = (item: (typeof items)[0]) => {
        if (item.source === 'inbox') {
            setActiveThread(item.originalId);
            if (pathname !== '/dashboard/inbox') {
                router.push('/dashboard/inbox');
            }
        } else {
            setActiveSession(item.originalId);
            if (pathname !== '/dashboard/playbooks') {
                router.push('/dashboard/playbooks');
            }
        }
    };

    // Filter button component
    const FilterButton = ({
        value,
        label,
        count,
    }: {
        value: HistorySource;
        label: string;
        count: number;
    }) => (
        <button
            onClick={() => setFilter(value)}
            className={cn(
                'px-1.5 py-0.5 text-[9px] rounded transition-colors',
                filter === value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
        >
            {label}
            {count > 0 && (
                <span className="ml-0.5 opacity-60">({count})</span>
            )}
        </button>
    );

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

            {/* Filter Toggle - only show if we have items from multiple sources */}
            {counts.inbox > 0 && counts.playbooks > 0 && (
                <div className="px-3 pb-2 flex items-center gap-1">
                    <FilterButton value="all" label="All" count={counts.all} />
                    <FilterButton value="inbox" label="Inbox" count={counts.inbox} />
                    <FilterButton value="playbooks" label="Playbooks" count={counts.playbooks} />
                </div>
            )}

            <div className="px-2">
                <div className="space-y-0.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {isEmpty ? (
                        <p className="text-[10px] text-muted-foreground text-center py-2 italic opacity-60">
                            No recent activity
                        </p>
                    ) : (
                        items.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelectItem(item)}
                                className={cn(
                                    'w-full text-left px-2 py-1.5 rounded-md transition-all text-xs group flex items-center gap-2',
                                    activeItemId === item.id
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-transparent'
                                )}
                            >
                                {/* Icon indicates source */}
                                {item.source === 'inbox' ? (
                                    <Inbox className="h-3 w-3 shrink-0 opacity-60" />
                                ) : (
                                    <MessageSquare className="h-3 w-3 shrink-0 opacity-60" />
                                )}
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    <span className="truncate block font-medium">{item.title}</span>
                                    <span className="text-[9px] opacity-70">
                                        {formatSmartTime(item.timestamp, { abbreviated: true })}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
            <div className="mx-4 mt-2 mb-2 border-b border-border/40" />
        </div>
    );
}
