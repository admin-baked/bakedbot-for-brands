'use client';

/**
 * Inbox Empty State
 *
 * Shown when no thread is selected in the inbox.
 */

import React, { useEffect, useState } from 'react';
import { Inbox, Images, PackagePlus, Palette, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useInboxStore } from '@/lib/store/inbox-store';
import type { InboxQuickAction } from '@/types/inbox';
import { createInboxThread } from '@/server/actions/inbox';

// ============ Props ============

interface InboxEmptyStateProps {
    isLoading?: boolean;
    className?: string;
}

// ============ Icon Mapping ============

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Images,
    PackagePlus,
    Palette,
};

// ============ Quick Start Card ============

function QuickStartCard({ action }: { action: InboxQuickAction }) {
    const { createThread, updateThreadId, currentOrgId } = useInboxStore();
    const [isCreating, setIsCreating] = useState(false);
    const Icon = ICON_MAP[action.icon] || Inbox;

    const handleClick = async () => {
        if (isCreating) return;
        setIsCreating(true);

        try {
            // Create thread locally first for instant UI feedback
            const localThread = createThread(action.threadType, {
                title: action.label,
                primaryAgent: action.defaultAgent,
            });

            // Persist to Firestore - pass local ID to avoid race conditions
            const result = await createInboxThread({
                id: localThread.id, // Use the same ID as local thread
                type: action.threadType,
                title: action.label,
                primaryAgent: action.defaultAgent,
                brandId: currentOrgId || undefined,
                dispensaryId: currentOrgId || undefined,
            });

            if (!result.success) {
                console.error('[QuickStartCard] Failed to persist thread:', result.error);
            }
        } catch (error) {
            console.error('[QuickStartCard] Error creating thread:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isCreating}
            className={cn(
                "group p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-left",
                isCreating && "opacity-70 cursor-not-allowed"
            )}
        >
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {isCreating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
                </div>
                <div>
                    <h3 className="font-semibold">{action.label}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
            </div>
        </button>
    );
}

// ============ Main Component ============

export function InboxEmptyState({ isLoading, className }: InboxEmptyStateProps) {
    const { getQuickActions, loadQuickActions, currentRole } = useInboxStore();
    const quickActions = getQuickActions();

    // Load quick actions when role changes
    useEffect(() => {
        loadQuickActions();
    }, [currentRole, loadQuickActions]);

    if (isLoading) {
        return (
            <div className={cn('flex items-center justify-center h-full', className)}>
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading your inbox...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('flex items-center justify-center h-full p-8', className)}>
            <div className="max-w-2xl w-full">
                {/* Welcome Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Welcome to your Inbox</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Create carousels, bundles, and social content through conversation with our AI agents.
                    </p>
                </div>

                {/* Quick Start Grid */}
                {quickActions.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-medium text-muted-foreground text-center">
                            Quick Start
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {quickActions.slice(0, 4).map((action) => (
                                <QuickStartCard key={action.id} action={action} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Tips */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-muted-foreground">
                        Tip: Use the sidebar quick actions or start typing to begin a conversation
                    </p>
                </div>
            </div>
        </div>
    );
}

export default InboxEmptyState;
