'use client';

/**
 * Unified History Hook
 *
 * Merges items from both agent-chat-store (playbook sessions) and inbox-store (threads)
 * into a single sorted list with filter support.
 */

import { useMemo, useState, useCallback } from 'react';
import { useAgentChatStore, ChatSession } from '@/lib/store/agent-chat-store';
import { useInboxStore } from '@/lib/store/inbox-store';
import type { InboxThread } from '@/types/inbox';

export type HistorySource = 'all' | 'inbox' | 'playbooks';

export interface UnifiedHistoryItem {
    id: string;
    title: string;
    preview: string;
    timestamp: Date;
    itemType: 'session' | 'thread';
    source: 'agent-chat' | 'inbox';
    originalId: string;
    threadType?: string; // For inbox threads
}

interface UseUnifiedHistoryOptions {
    role: string | null;
    maxItems?: number;
}

interface UseUnifiedHistoryReturn {
    items: UnifiedHistoryItem[];
    activeItemId: string | null;
    isEmpty: boolean;
    filter: HistorySource;
    setFilter: (filter: HistorySource) => void;
    counts: {
        all: number;
        inbox: number;
        playbooks: number;
    };
}

/**
 * Check if a role is a business role (brand or dispensary)
 */
function isBusinessRole(role: string | null): boolean {
    if (!role) return false;
    return [
        'brand',
        'brand_admin',
        'brand_member',
        'dispensary',
        'dispensary_admin',
        'dispensary_staff',
        'budtender',
    ].includes(role);
}

export function useUnifiedHistory({
    role,
    maxItems = 10,
}: UseUnifiedHistoryOptions): UseUnifiedHistoryReturn {
    const [filter, setFilter] = useState<HistorySource>('all');

    const agentSessions = useAgentChatStore((state) => state.sessions);
    const activeSessionId = useAgentChatStore((state) => state.activeSessionId);
    const inboxThreads = useInboxStore((state) => state.threads);
    const activeThreadId = useInboxStore((state) => state.activeThreadId);

    // Transform and merge items
    const allItems = useMemo(() => {
        if (!role) return [];

        const items: UnifiedHistoryItem[] = [];

        // Add inbox threads (non-archived)
        inboxThreads
            .filter((t) => t.status !== 'archived')
            .forEach((thread) => {
                items.push({
                    id: `inbox-${thread.id}`,
                    title: thread.title,
                    preview: thread.preview || 'No messages yet',
                    timestamp: new Date(thread.lastActivityAt),
                    itemType: 'thread',
                    source: 'inbox',
                    originalId: thread.id,
                    threadType: thread.type,
                });
            });

        // Add agent-chat sessions (filtered by role for super_user)
        agentSessions
            .filter((s) => {
                // For business roles, still include their playbook sessions if any
                // For super_user, filter by role
                if (isBusinessRole(role)) {
                    return s.role === role;
                }
                return s.role === role;
            })
            .forEach((session) => {
                items.push({
                    id: `session-${session.id}`,
                    title: session.title,
                    preview: session.preview || 'No messages',
                    timestamp: new Date(session.timestamp),
                    itemType: 'session',
                    source: 'agent-chat',
                    originalId: session.id,
                });
            });

        // Sort by timestamp (most recent first)
        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return items;
    }, [role, agentSessions, inboxThreads]);

    // Calculate counts
    const counts = useMemo(() => {
        const inbox = allItems.filter((i) => i.source === 'inbox').length;
        const playbooks = allItems.filter((i) => i.source === 'agent-chat').length;
        return {
            all: allItems.length,
            inbox,
            playbooks,
        };
    }, [allItems]);

    // Apply filter
    const filteredItems = useMemo(() => {
        let filtered = allItems;

        if (filter === 'inbox') {
            filtered = allItems.filter((i) => i.source === 'inbox');
        } else if (filter === 'playbooks') {
            filtered = allItems.filter((i) => i.source === 'agent-chat');
        }

        return filtered.slice(0, maxItems);
    }, [allItems, filter, maxItems]);

    // Determine active item
    const activeItemId = useMemo(() => {
        if (!role) return null;

        if (activeThreadId) {
            return `inbox-${activeThreadId}`;
        }
        if (activeSessionId) {
            return `session-${activeSessionId}`;
        }
        return null;
    }, [role, activeThreadId, activeSessionId]);

    const handleSetFilter = useCallback((newFilter: HistorySource) => {
        setFilter(newFilter);
    }, []);

    return {
        items: filteredItems,
        activeItemId,
        isEmpty: filteredItems.length === 0,
        filter,
        setFilter: handleSetFilter,
        counts,
    };
}
