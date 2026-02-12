'use client';

/**
 * Unified Inbox
 *
 * Main container component for the conversation-driven workspace.
 * Consolidates Carousels, Bundles, and Creative Center into a single inbox.
 */

import React, { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useInboxStore, useActiveThread, useActiveThreadArtifacts } from '@/lib/store/inbox-store';
import { useUserRole } from '@/hooks/use-user-role';
import { InboxSidebar } from './inbox-sidebar';
import { InboxConversation } from './inbox-conversation';
import { InboxArtifactPanel } from './inbox-artifact-panel';
import { InboxEmptyState } from './inbox-empty-state';
import { CrmContextPanel } from './crm/crm-context-panel';
import type { InboxThreadType } from '@/types/inbox';
import { getInboxThreads, createInboxThread } from '@/server/actions/inbox';

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
        createThread,
        setActiveThread,
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

    // Handle newThread URL params (e.g., /inbox?newThread=crm_customer&customerId=X&customerName=Y)
    const newThreadHandled = useRef(false);
    useEffect(() => {
        if (newThreadHandled.current) return;
        const newThreadType = searchParams.get('newThread') as InboxThreadType | null;
        if (!newThreadType || !role) return;

        const customerId = searchParams.get('customerId') || undefined;
        const customerName = searchParams.get('customerName') || undefined;
        const customerEmail = searchParams.get('customerEmail') || undefined;

        newThreadHandled.current = true;

        // Create CRM thread with customer context
        const title = customerName
            ? `${customerName} — CRM`
            : `New ${newThreadType} conversation`;

        const thread = createThread(newThreadType, {
            title,
            brandId: orgId || undefined,
            dispensaryId: orgId || undefined,
        });

        // Attach CRM fields if present
        if (customerId) thread.customerId = customerId;
        if (customerEmail) thread.customerEmail = customerEmail;

        setActiveThread(thread.id);

        // Persist to server
        createInboxThread({
            id: thread.id,
            type: newThreadType,
            title,
            brandId: orgId || undefined,
            dispensaryId: orgId || undefined,
            customerId,
            customerEmail,
        }).catch(() => {
            // Silent fail — thread exists in local store
        });
    }, [searchParams, role, orgId, createThread, setActiveThread]);

    // Determine if CRM panel should show
    const showCrmPanel = activeThread?.type === 'crm_customer' && activeThread?.customerId;

    return (
        <div className={cn(
            'relative flex h-full w-full overflow-hidden',
            'bg-gradient-to-br from-background via-background to-baked-950/10',
            className
        )}>
            {/* Subtle animated background orbs for premium feel */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-baked-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-baked-600/5 rounded-full blur-3xl" />
            </div>

            {/* Sidebar - Thread list and quick actions */}
            <InboxSidebar
                collapsed={isSidebarCollapsed}
                className={cn(
                    'relative z-10 transition-all duration-300',
                    isSidebarCollapsed ? 'w-16' : 'w-80'
                )}
            />

            {/* Main Content Area */}
            <div className="relative z-10 flex flex-1 overflow-hidden">
                {/* Conversation Area */}
                <div className={cn(
                    'flex-1 flex flex-col overflow-hidden transition-all duration-300',
                    isArtifactPanelOpen && 'mr-0'
                )}>
                    <AnimatePresence mode="wait">
                        {activeThread ? (
                            <motion.div
                                key={activeThread.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                <InboxConversation
                                    thread={activeThread}
                                    artifacts={activeArtifacts}
                                    className="flex-1"
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1"
                            >
                                <InboxEmptyState
                                    isLoading={isLoading}
                                    className="flex-1"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Panel — CRM Context or Artifact Panel */}
                <AnimatePresence>
                    {showCrmPanel && (
                        <motion.div
                            key="crm-panel"
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-[320px]"
                        >
                            <CrmContextPanel
                                customerId={activeThread.customerId!}
                                customerEmail={activeThread.customerEmail}
                                orgId={activeThread.orgId}
                                className="h-full"
                            />
                        </motion.div>
                    )}
                    {!showCrmPanel && isArtifactPanelOpen && activeArtifacts.length > 0 && (
                        <motion.div
                            key="artifact-panel"
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-[400px]"
                        >
                            <InboxArtifactPanel
                                artifacts={activeArtifacts}
                                className="h-full"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default UnifiedInbox;
