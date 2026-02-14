// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

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
import { useInboxStore } from '@/lib/store/inbox-store';
import { useUserRole } from '@/hooks/use-user-role';
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
    const { role } = useUserRole();

    const isSuper = role === 'super_user' || role === 'super_admin';

    // Determine role for chat component
    const chatRole = role === 'brand' || role === 'brand_admin' || role === 'brand_member'
        ? 'brand'
        : role === 'dispensary' || role === 'dispensary_admin' || role === 'dispensary_staff'
        ? 'dispensary'
        : isSuper
        ? 'super_admin'
        : 'customer';

    return (
        <div className="h-full flex flex-col">
            {/* View Toggle Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div>
                    <h1 className="text-lg font-semibold">
                        {viewMode === 'inbox' ? 'Unified Inbox' : 'Agent Chat'}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {viewMode === 'inbox'
                            ? 'Thread-based conversations with your AI agents'
                            : 'Traditional chat experience with your AI agents'}
                    </p>
                </div>
                <InboxViewToggle />
            </div>

            {/* View Content - Animated transitions */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {viewMode === 'inbox' ? (
                        <motion.div
                            key="inbox"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="h-full"
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
                            className="h-full p-6"
                        >
                            <UnifiedAgentChat
                                role={chatRole as any}
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
        <div className="h-[calc(100vh-4rem)]">
            <Suspense fallback={<InboxLoading />}>
                <InboxContent />
            </Suspense>
        </div>
    );
}
