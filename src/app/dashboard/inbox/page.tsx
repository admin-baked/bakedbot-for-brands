'use client';

/**
 * Unified Inbox Page
 *
 * Main entry point for the conversation-driven inbox that replaces
 * separate Carousels, Bundles, and Creative Center pages.
 */

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { UnifiedInbox } from '@/components/inbox';

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

export default function InboxPage() {
    return (
        <div className="h-[calc(100vh-4rem)]">
            <Suspense fallback={<InboxLoading />}>
                <UnifiedInbox />
            </Suspense>
        </div>
    );
}
