'use client';



/**
 * Unified Inbox Page
 *
 * Main entry point for the conversation-driven inbox that replaces
 * separate Carousels, Bundles, and Creative Center pages.
 *
 * Now supports toggling between Unified Inbox and Traditional Agent Chat views.
 */

import React, { Suspense, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UnifiedInbox } from '@/components/inbox';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import { InboxViewToggle } from '@/components/inbox/inbox-view-toggle';
import { InboxWorkspaceBriefing } from '@/components/inbox/inbox-workspace-briefing';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useUserRole } from '@/hooks/use-user-role';
import { isBrandRole, isDispensaryRole, isGrowerRole } from '@/types/roles';
import { motion, AnimatePresence } from 'framer-motion';
import { ensureWelcomeThread } from '@/server/actions/welcome-thread';
import { ProductTour } from '@/components/onboarding/product-tour';

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
    const showChecklist = isBrandRole(role) || isDispensary;
    const welcomeTriggered = useRef(false);

    useEffect(() => {
        if (!role || isSuper || welcomeTriggered.current) return;
        welcomeTriggered.current = true;
        void ensureWelcomeThread();
    }, [role, isSuper]);

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

    return (
        <div className="flex h-full flex-col w-full min-h-0 overflow-hidden">
            {/* Header: view toggle + workspace briefing */}
            <div className="shrink-0 flex flex-col border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-4 py-2 sm:px-6">
                    <AnimatePresence initial={false}>
                        {viewMode === 'inbox' && shouldShowWorkspaceBriefing && (
                            <motion.div
                                key="workspace-briefing"
                                initial={{ opacity: 0, height: 0, y: -8, filter: 'blur(8px)' }}
                                animate={{ opacity: 1, height: 'auto', y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, height: 0, y: -12, filter: 'blur(12px)' }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="hidden lg:block overflow-hidden flex-1 min-w-0 mr-3"
                            >
                                <InboxWorkspaceBriefing />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="ml-auto shrink-0">
                        <InboxViewToggle />
                    </div>
                </div>
            </div>

            {/* Setup checklist — pinned for new brand/dispensary orgs until completed or dismissed */}
            {viewMode === 'inbox' && showChecklist && (
                <div className="shrink-0 px-4 pt-3 sm:px-6" data-tour="setup-checklist">
                    <SetupChecklist />
                </div>
            )}

            {/* View Content - Animated transitions */}
            <div className="flex-1 flex flex-col w-full min-h-0 overflow-hidden" data-tour="inbox-area">
                <AnimatePresence mode="wait">
                    {viewMode === 'inbox' ? (
                        <motion.div
                            key="inbox"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col flex-1 w-full h-full min-h-0 overflow-hidden"
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

            {/* Product tour — manages its own visibility via localStorage + role check */}
            <ProductTour />
        </div>
    );
}

export default function InboxPage() {
    return (
        <div className="h-full overflow-hidden">
            <Suspense fallback={<InboxLoading />}>
                <InboxContent />
            </Suspense>
        </div>
    );
}
