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
import {
    InboxAgentPersonaSchema,
    InboxThreadTypeSchema,
} from '@/types/inbox';
import type { InboxAgentPersona, InboxThreadType } from '@/types/inbox';
import { getInboxThreads, createInboxThread } from '@/server/actions/inbox';
import { useIsMobile } from '@/hooks/use-mobile';

interface UnifiedInboxProps {
    className?: string;
}

export function UnifiedInbox({ className }: UnifiedInboxProps) {
    const searchParams = useSearchParams();
    const { role, orgId } = useUserRole();

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

    useEffect(() => {
        if (role) {
            setCurrentRole(role);
        }
        if (orgId) {
            setCurrentOrgId(orgId);
        }
    }, [role, orgId, setCurrentRole, setCurrentOrgId]);

    useEffect(() => {
        const typeParam = searchParams.get('type');
        if (
            typeParam
            && ['carousel', 'bundle', 'creative', 'image', 'video', 'campaign', 'launch', 'crm_customer', 'general', 'product_discovery', 'wholesale_inventory', 'support'].includes(typeParam)
        ) {
            setThreadFilter({ type: typeParam as InboxThreadType });
        }
    }, [searchParams, setThreadFilter]);

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

    const handledThreadSeedRef = useRef<string | null>(null);
    useEffect(() => {
        const rawThreadType = searchParams.get('newThread');
        const rawAgent = searchParams.get('agent');
        const rawPrompt = searchParams.get('prompt')?.trim() || '';
        const customerId = searchParams.get('customerId') || undefined;
        const customerName = searchParams.get('customerName') || undefined;
        const customerEmail = searchParams.get('customerEmail') || undefined;

        const parsedThreadType = rawThreadType
            ? InboxThreadTypeSchema.safeParse(rawThreadType)
            : null;
        const newThreadType: InboxThreadType | null = parsedThreadType?.success
            ? parsedThreadType.data
            : (rawAgent || rawPrompt ? 'general' : null);

        if (!newThreadType || !role) {
            handledThreadSeedRef.current = null;
            return;
        }

        const parsedAgent = rawAgent
            ? InboxAgentPersonaSchema.safeParse(rawAgent)
            : null;
        const primaryAgent: InboxAgentPersona | undefined = parsedAgent?.success
            ? parsedAgent.data
            : undefined;

        const seedSignature = JSON.stringify({
            newThreadType,
            primaryAgent,
            rawPrompt,
            customerId,
            customerName,
            customerEmail,
            orgId,
        });

        if (handledThreadSeedRef.current === seedSignature) {
            return;
        }

        handledThreadSeedRef.current = seedSignature;

        const initialMessage = rawPrompt
            ? {
                id: `seed-message-${Date.now()}`,
                type: 'user' as const,
                content: rawPrompt,
                timestamp: new Date(),
            }
            : undefined;

        const title = customerName
            ? `${customerName} - CRM`
            : rawPrompt
                ? rawPrompt.slice(0, 72)
                : `New ${newThreadType} conversation`;

        const thread = createThread(newThreadType, {
            title,
            initialMessage,
            primaryAgent,
            brandId: orgId || undefined,
            dispensaryId: orgId || undefined,
        });

        if (customerId) thread.customerId = customerId;
        if (customerEmail) thread.customerEmail = customerEmail;

        setActiveThread(thread.id);

        createInboxThread({
            id: thread.id,
            type: newThreadType,
            title,
            primaryAgent,
            brandId: orgId || undefined,
            dispensaryId: orgId || undefined,
            customerId,
            customerEmail,
            initialMessage,
        }).catch((err) => {
            console.error('[UnifiedInbox] Failed to persist thread to server:', err);
        });

        if (typeof window !== 'undefined') {
            const nextParams = new URLSearchParams(window.location.search);
            nextParams.delete('newThread');
            nextParams.delete('agent');
            nextParams.delete('prompt');
            nextParams.delete('customerId');
            nextParams.delete('customerName');
            nextParams.delete('customerEmail');
            const nextQuery = nextParams.toString();
            const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
            window.history.replaceState({}, '', nextUrl);
        }
    }, [searchParams, role, orgId, createThread, setActiveThread]);

    const isMobile = useIsMobile();
    const showCrmPanel = activeThread?.type === 'crm_customer' && activeThread?.customerId;

    return (
        <div
            className={cn(
                'relative flex h-full w-full overflow-hidden',
                'bg-gradient-to-br from-background via-background to-baked-950/10',
                className
            )}
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-baked-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-baked-600/5 rounded-full blur-3xl" />
            </div>

            <InboxSidebar
                collapsed={isMobile ? false : isSidebarCollapsed}
                className={cn(
                    'relative z-10 transition-all duration-300',
                    isMobile
                        ? (activeThreadId ? 'hidden' : 'flex w-full')
                        : (isSidebarCollapsed ? 'w-16' : 'w-80')
                )}
            />

            <div
                className={cn(
                    'relative z-10 flex overflow-hidden',
                    isMobile ? (activeThreadId ? 'flex-1' : 'hidden') : 'flex-1'
                )}
            >
                <div
                    className={cn(
                        'flex-1 min-h-0 flex flex-col overflow-hidden transition-all duration-300',
                        isArtifactPanelOpen && 'mr-0'
                    )}
                >
                    <AnimatePresence mode="wait">
                        {activeThread ? (
                            <motion.div
                                key={activeThread.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 min-h-0 flex flex-col overflow-hidden"
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

                <AnimatePresence>
                    {showCrmPanel && (
                        <motion.div
                            key="crm-panel"
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="hidden md:block md:w-[320px]"
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
                            className="hidden md:block md:w-[400px]"
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
