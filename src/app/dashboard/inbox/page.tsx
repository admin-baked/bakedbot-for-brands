'use client';



/**
 * Unified Inbox Page
 *
 * Main entry point for the conversation-driven inbox that replaces
 * separate Carousels, Bundles, and Creative Center pages.
 *
 * Now supports toggling between Unified Inbox and Traditional Agent Chat views.
 */

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { UnifiedInbox } from '@/components/inbox';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import { InboxViewToggle } from '@/components/inbox/inbox-view-toggle';
import { InboxWorkspaceBriefing } from '@/components/inbox/inbox-workspace-briefing';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useUserRole } from '@/hooks/use-user-role';
import { isBrandRole, isDispensaryRole, isGrowerRole } from '@/types/roles';
import { motion, AnimatePresence } from 'framer-motion';

function InboxLoading() {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading Inbox...</p>
            </div>
        </div>
    );
}

function InboxContent() {
    const viewMode = useInboxStore((state) => state.viewMode);
    const shouldShowWorkspaceBriefing = useInboxStore((state) => {
        if (!state.activeThreadId) {
            return true;
        }

        const activeThread = state.threads.find((thread) => thread.id === state.activeThreadId);
        return (activeThread?.messages.length ?? 0) === 0;
    });
    const { role } = useUserRole();

    const isSuper = role === 'super_user' || role === 'super_admin';
    const isGrower = isGrowerRole(role);
    const isDispensary = isDispensaryRole(role);

    // Determine role for chat component
    const chatRole = isBrandRole(role)
        ? 'brand'
        : isDispensary
        ? 'dispensary'
        : isGrower
        ? 'grower'
        : isSuper
        ? 'super_admin'
        : 'customer';

    const modeDescription = viewMode === 'inbox'
        ? isGrower
            ? 'Thread-based wholesale workflows for yield, buyer-ready inventory, and brand outreach.'
            : isDispensary
                ? 'Thread-based conversations for store ops, compliance, and daily retail decision-making.'
                : 'Thread-based conversations with your AI agents.'
        : isGrower
            ? 'Direct chat for cultivation, transfer readiness, and wholesale execution.'
            : isDispensary
                ? 'Direct chat for store operations, pricing, and customer-facing follow-up.'
                : 'Traditional chat experience with your AI agents.';

    return (
        <div className={cn(
            "flex h-full flex-col w-full",
            shouldShowWorkspaceBriefing ? "overflow-y-auto overflow-x-hidden" : "min-h-0 overflow-hidden"
        )}>
            {/* View Toggle Header */}
            <div className="shrink-0 flex flex-col gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 sm:py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-base font-semibold sm:text-lg">
                            {viewMode === 'inbox' ? 'Unified Inbox' : 'Agent Chat'}
                        </h1>
                        <p className="max-w-2xl text-[11px] text-muted-foreground sm:text-xs">
                            {modeDescription}
                        </p>
                    </div>
                    <div className="self-start sm:self-center">
                        <InboxViewToggle />
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {viewMode === 'inbox' && shouldShowWorkspaceBriefing && (
                        <motion.div
                            key="workspace-briefing"
                            initial={{ opacity: 0, height: 0, y: -12, scale: 0.985, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, height: 'auto', y: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, height: 0, y: -18, scale: 0.97, filter: 'blur(14px)' }}
                            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                        >
                            <InboxWorkspaceBriefing className="hidden lg:block" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* View Content - Animated transitions */}
            <div className={cn(
                "flex-1 flex flex-col w-full",
                shouldShowWorkspaceBriefing ? "shrink-0 min-h-[600px]" : "min-h-0 overflow-hidden"
            )}>
                <AnimatePresence mode="wait">
                    {viewMode === 'inbox' ? (
                        <motion.div
                            key="inbox"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "flex flex-col flex-1 w-full",
                                shouldShowWorkspaceBriefing ? "" : "h-full min-h-0 overflow-hidden"
                            )}
                        >
                            <UnifiedInbox className="h-full" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="h-full min-h-0 p-6"
                        >
                            <UnifiedAgentChat
                                role={chatRole}
                                showHeader={true}
                                height="h-full"
                                isAuthenticated={true}
                                isSuperUser={isSuper}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function InboxPage() {
    return (
        <div className="h-[calc(100dvh-4rem)] overflow-hidden">
            <Suspense fallback={<InboxLoading />}>
                <InboxContent />
            </Suspense>
        </div>
    );
}
