'use client';

/**
 * Inbox Empty State
 *
 * Shown when no thread is selected in the inbox.
 * Features contextual preset suggestions and custom text input.
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import {
    Inbox,
    Images,
    PackagePlus,
    Palette,
    Megaphone,
    Loader2,
    Sparkles,
    Send,
    RefreshCw,
    Plus,
    TrendingUp,
    Search,
    Calendar,
    HelpCircle,
    Video,
    ImagePlus,
    Maximize2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useContextualPresets } from '@/hooks/use-contextual-presets';
import { useUserRole } from '@/hooks/use-user-role';
import type { InboxQuickAction } from '@/types/inbox';
import { createInboxThread } from '@/server/actions/inbox';
import { useToast } from '@/hooks/use-toast';
import { InsightCardsGrid } from './insight-cards-grid';
import { InboxConversation } from './inbox-conversation';

// ============ Props ============

interface InboxEmptyStateProps {
    isLoading?: boolean;
    className?: string;
}

// ============ Icon Mapping ============

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Images,
    ImagePlus,
    PackagePlus,
    Palette,
    Megaphone,
    TrendingUp,
    Search,
    Calendar,
    HelpCircle,
    Video,
    Send,
    Inbox,
};

function getIcon(iconName: string) {
    return ICON_MAP[iconName] || Inbox;
}

// ============ Preset Chip ============

interface PresetChipProps {
    action: InboxQuickAction;
    hasCustomText: boolean;
    onSelect: () => void;
    isCreating: boolean;
}

function PresetChip({ action, hasCustomText, onSelect, isCreating }: PresetChipProps) {
    const Icon = getIcon(action.icon);

    return (
        <button
            onClick={onSelect}
            disabled={isCreating}
            className={cn(
                'group flex items-center gap-2 px-4 py-2 rounded-full border transition-all',
                'bg-card hover:bg-muted/50 hover:border-primary/30',
                hasCustomText && 'ring-2 ring-primary/20 border-primary/30',
                isCreating && 'opacity-70 cursor-not-allowed'
            )}
        >
            {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Icon className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
            )}
            <span className="text-sm font-medium">{action.label}</span>
            {hasCustomText && <Plus className="h-3 w-3 text-muted-foreground" />}
        </button>
    );
}

// ============ Main Component ============

export function InboxEmptyState({ isLoading, className }: InboxEmptyStateProps) {
    const { role } = useUserRole();
    const {
        createThread,
        deleteThread,
        markThreadPending,
        markThreadPersisted,
        currentOrgId,
        activeThreadId,
        threads,
        setActiveThread,
        inboxArtifacts,
    } = useInboxStore();
    const { presets, greeting, suggestion, refresh, isLoading: presetsLoading } = useContextualPresets({
        role,
        orgId: currentOrgId,
    });
    const { toast } = useToast();

    const [customText, setCustomText] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const hasCustomText = customText.trim().length > 0;

    // Handle preset selection (with optional custom text)
    const handlePresetSelect = async (action: InboxQuickAction) => {
        if (isCreating) return;
        setIsCreating(true);

        let localThread = null;
        try {
            // Create title - include custom text if present
            const threadTitle = hasCustomText
                ? `${action.label}: ${customText.slice(0, 30)}${customText.length > 30 ? '...' : ''}`
                : action.label;

            // Create thread locally first for instant UI feedback
            localThread = createThread(action.threadType, {
                title: threadTitle,
                primaryAgent: action.defaultAgent,
            });

            // Mark thread as pending (not yet persisted to Firestore)
            markThreadPending(localThread.id);

            // Persist to Firestore
            const result = await createInboxThread({
                id: localThread.id,
                type: action.threadType,
                title: threadTitle,
                primaryAgent: action.defaultAgent,
                brandId: currentOrgId || undefined,
                dispensaryId: currentOrgId || undefined,
            });

            if (!result.success) {
                console.error('[InboxEmptyState] Failed to persist thread:', result.error);
                deleteThread(localThread.id);
                toast({
                    title: 'Failed to create conversation',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
                return;
            }

            // Mark thread as persisted (safe to use now)
            markThreadPersisted(localThread.id);
            setCustomText(''); // Clear input on success
        } catch (error) {
            console.error('[InboxEmptyState] Error:', error);
            if (localThread) deleteThread(localThread.id);
            toast({
                title: 'Failed to create conversation',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Handle custom-only submit (Enter key or button)
    const handleCustomSubmit = async () => {
        if (!customText.trim() || isCreating) return;

        setIsCreating(true);
        let localThread = null;

        try {
            const title =
                customText.slice(0, 40) + (customText.length > 40 ? '...' : '');

            // Create a general thread with custom text
            localThread = createThread('general', {
                title,
                primaryAgent: 'auto',
            });

            markThreadPending(localThread.id);

            const result = await createInboxThread({
                id: localThread.id,
                type: 'general',
                title,
                primaryAgent: 'auto',
                brandId: currentOrgId || undefined,
            });

            if (!result.success) {
                deleteThread(localThread.id);
                toast({
                    title: 'Failed to create conversation',
                    description: result.error || 'Please try again',
                    variant: 'destructive',
                });
                return;
            }

            markThreadPersisted(localThread.id);
            setCustomText('');
        } catch (error) {
            if (localThread) deleteThread(localThread.id);
            toast({
                title: 'Failed to create conversation',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCustomSubmit();
        }
    };

    if (isLoading || presetsLoading) {
        return (
            <div className={cn('flex items-center justify-center h-full', className)}>
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading your inbox...</p>
                </div>
            </div>
        );
    }

    // Get active thread and its artifacts if exists
    const activeThread = activeThreadId ? threads.find(t => t.id === activeThreadId) : null;
    const activeArtifacts = activeThread
        ? inboxArtifacts.filter(a => a.threadId === activeThread.id)
        : [];

    // === INLINE CONVERSATION VIEW ===
    // Show conversation within empty state when thread is active
    if (activeThread) {
        return (
            <div className={cn('flex flex-col h-full', className)}>
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto p-6 space-y-6">
                        {/* Compact Insight Cards */}
                        <InsightCardsGrid maxCards={3} />

                        {/* Quick Actions Bar */}
                        <div className="flex items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Quick Chat</span>
                                <span className="text-xs text-muted-foreground">
                                    {activeThread.title}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setActiveThread(null)}
                                    className="h-8 gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    New Query
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Stay on this thread but user can manually switch to full view via sidebar
                                        toast({
                                            title: 'Tip',
                                            description: 'Click the thread in the sidebar to see the full conversation view',
                                        });
                                    }}
                                    className="h-8 gap-2"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                    Full View
                                </Button>
                            </div>
                        </div>

                        {/* Inline Conversation */}
                        <div className="border rounded-lg bg-card">
                            <InboxConversation
                                thread={activeThread}
                                artifacts={activeArtifacts}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // === EMPTY STATE (NO ACTIVE THREAD) ===
    return (
        <div className={cn('flex items-center justify-center h-full p-8', className)}>
            <div className="max-w-4xl w-full space-y-8">
                {/* Daily Briefing - Insight Cards */}
                <InsightCardsGrid maxCards={5} />

                {/* Welcome Header with Contextual Greeting */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">{greeting}!</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        {suggestion}
                    </p>
                </div>

                {/* Custom Text Input */}
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What would you like to work on? Type here or pick a suggestion below..."
                        className={cn(
                            'min-h-[100px] pr-12 resize-none',
                            'bg-card border-muted-foreground/20 focus:border-primary/50'
                        )}
                        disabled={isCreating}
                    />
                    {hasCustomText && (
                        <Button
                            size="icon"
                            className="absolute bottom-3 right-3"
                            onClick={handleCustomSubmit}
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                </div>

                {/* Contextual hint */}
                {hasCustomText && (
                    <p className="text-xs text-center text-muted-foreground -mt-4">
                        Press Enter to send, or click a suggestion below to combine
                        it with your message
                    </p>
                )}

                {/* Preset Suggestions */}
                {presets.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                Quick Suggestions
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={refresh}
                                disabled={isCreating}
                                title="Refresh suggestions"
                            >
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {presets.map((action) => (
                                <PresetChip
                                    key={action.id}
                                    action={action}
                                    hasCustomText={hasCustomText}
                                    onSelect={() => handlePresetSelect(action)}
                                    isCreating={isCreating}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Tips */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        {hasCustomText
                            ? 'Click a suggestion to combine it with your message'
                            : 'Type a specific request or click a suggestion to get started'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default InboxEmptyState;
