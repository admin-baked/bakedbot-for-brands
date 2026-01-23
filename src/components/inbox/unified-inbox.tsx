'use client';

/**
 * Unified Inbox
 *
 * Main container component for the conversation-driven workspace.
 * Consolidates Carousels, Bundles, and Creative Center into a single inbox.
 */

import React, { useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useInboxStore, useActiveThread, useActiveThreadArtifacts } from '@/lib/store/inbox-store';
import { useUserRole } from '@/hooks/use-user-role';
import { InboxSidebar } from './inbox-sidebar';
import { InboxConversation } from './inbox-conversation';
import { InboxArtifactPanel } from './inbox-artifact-panel';
import { InboxEmptyState } from './inbox-empty-state';
import type { InboxThreadType } from '@/types/inbox';
import { getInboxThreads } from '@/server/actions/inbox';

interface UnifiedInboxProps {
    className?: string;
}

export function UnifiedInbox({ className }: UnifiedInboxProps) {
    const searchParams = useSearchParams();
    const { role, orgId } = useUserRole();

    // Store state
    const {
        activeThreadId,
        isArtifactPanelOpen,
        isSidebarCollapsed,
        setCurrentRole,
        setCurrentOrgId,
        hydrateThreads,
        setThreadFilter,
        setLoading,
        isLoading,
    } = useInboxStore();

    const activeThread = useActiveThread();
    const activeArtifacts = useActiveThreadArtifacts();

    // Initialize store with user context
    useEffect(() => {
        if (role) {
            setCurrentRole(role);
        }
        if (orgId) {
            setCurrentOrgId(orgId);
        }
    }, [role, orgId, setCurrentRole, setCurrentOrgId]);

    // Handle URL params for type filter (e.g., /inbox?type=carousel)
    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (typeParam && ['carousel', 'bundle', 'creative', 'campaign', 'general', 'product_discovery', 'support'].includes(typeParam)) {
            setThreadFilter({ type: typeParam as InboxThreadType });
        }
    }, [searchParams, setThreadFilter]);

    // Load threads from server on mount
    useEffect(() => {
        async function loadThreads() {
            setLoading(true);
            try {
                const result = await getInboxThreads({ orgId: orgId || undefined });
                if (result.success && result.threads) {
                    hydrateThreads(result.threads);
                }
            } catch (error) {
                console.error('Failed to load inbox threads:', error);
            } finally {
                setLoading(false);
            }
        }

        if (role) {
            loadThreads();
        }
    }, [role, orgId, hydrateThreads, setLoading]);

    return (
        <div className={cn('flex h-full w-full overflow-hidden bg-background', className)}>
            {/* Sidebar - Thread list and quick actions */}
            <InboxSidebar
                collapsed={isSidebarCollapsed}
                className={cn(
                    'border-r transition-all duration-300',
                    isSidebarCollapsed ? 'w-16' : 'w-80'
                )}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Conversation Area */}
                <div className={cn(
                    'flex-1 flex flex-col overflow-hidden transition-all duration-300',
                    isArtifactPanelOpen && 'mr-0'
                )}>
                    {activeThread ? (
                        <InboxConversation
                            thread={activeThread}
                            artifacts={activeArtifacts}
                            className="flex-1"
                        />
                    ) : (
                        <InboxEmptyState
                            isLoading={isLoading}
                            className="flex-1"
                        />
                    )}
                </div>

                {/* Artifact Panel - Right side preview */}
                {isArtifactPanelOpen && activeArtifacts.length > 0 && (
                    <InboxArtifactPanel
                        artifacts={activeArtifacts}
                        className="w-[400px] border-l"
                    />
                )}
            </div>
        </div>
    );
}

export default UnifiedInbox;
