'use client';

/**
 * ResearchQueryDialog
 *
 * "What should Big Worm research?" dialog.
 * Shown when a user clicks a preset that has requiresQueryDialog: true.
 *
 * On submit:
 *   1. Creates a research task (createResearchTaskAction)
 *   2. Creates an inbox thread
 *   3. Saves a research_report artifact with the taskId
 *   4. Activates the thread so InboxResearchCard appears
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, BookOpen } from 'lucide-react';
import { useInboxStore } from '@/lib/store/inbox-store';
import { createInboxThread, createInboxArtifact } from '@/server/actions/inbox';
import { createResearchTaskAction } from '@/app/dashboard/research/actions';
import { useToast } from '@/hooks/use-toast';
import type { InboxQuickAction } from '@/types/inbox';

interface ResearchQueryDialogProps {
    action: InboxQuickAction | null;
    onClose: () => void;
}

const EXAMPLES = [
    'NY cannabis market trends and regulations for 2025',
    'Dispensary operations best practices for high-volume retail',
    'Competitor pricing analysis for recreational dispensaries in Syracuse',
    'Top-selling cannabis products and consumer preferences in 2025',
];

export function ResearchQueryDialog({ action, onClose }: ResearchQueryDialogProps) {
    const [query, setQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();
    const {
        createThread,
        deleteThread,
        markThreadPending,
        markThreadPersisted,
        currentOrgId,
        setActiveThread,
    } = useInboxStore();

    const open = !!action;

    useEffect(() => {
        if (open) {
            setQuery('');
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [open]);

    const handleSubmit = async () => {
        const trimmed = query.trim();
        if (!trimmed || isSubmitting || !action) return;

        setIsSubmitting(true);
        let localThread = null;

        try {
            const threadTitle = `Research: ${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}`;

            // 1. Create thread locally for instant UI
            localThread = createThread('deep_research', {
                title: threadTitle,
                primaryAgent: 'big_worm',
            });
            markThreadPending(localThread.id);

            // 2. Persist thread to Firestore
            const threadResult = await createInboxThread({
                id: localThread.id,
                type: 'deep_research',
                title: threadTitle,
                primaryAgent: 'big_worm',
                brandId: currentOrgId || undefined,
                dispensaryId: currentOrgId || undefined,
            });

            if (!threadResult.success) {
                deleteThread(localThread.id);
                toast({
                    title: 'Failed to create research thread',
                    description: threadResult.error || 'Please try again',
                    variant: 'destructive',
                });
                return;
            }

            markThreadPersisted(localThread.id);

            // 3. Create research task (triggers job processor via self-trigger)
            const taskResult = await createResearchTaskAction(trimmed);

            if (!taskResult.success || !taskResult.taskId) {
                toast({
                    title: 'Research task failed to start',
                    description: taskResult.error || 'Please try again',
                    variant: 'destructive',
                });
                // Still activate thread so user sees it
            } else {
                // 4. Create research_report artifact so InboxResearchCard appears in inbox
                await createInboxArtifact({
                    threadId: localThread.id,
                    type: 'research_report',
                    data: {
                        taskId: taskResult.taskId,
                        reportTitle: trimmed,
                        plan: [],
                    },
                    rationale: trimmed,
                });
            }

            // 5. Activate the thread
            setActiveThread(localThread.id);
            onClose();

        } catch (error) {
            if (localThread) deleteThread(localThread.id);
            toast({
                title: 'Failed to start research',
                description: 'An unexpected error occurred.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">🐛</span>
                        <DialogTitle className="text-lg">What should Big Worm research?</DialogTitle>
                    </div>
                    <DialogDescription>
                        Get a comprehensive deep-dive report on any topic — market trends, competitors,
                        regulations, or industry insights. Research starts in seconds.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-1">
                    <Textarea
                        ref={textareaRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe what you want researched..."
                        className="min-h-[100px] resize-none bg-muted/50"
                        disabled={isSubmitting}
                    />

                    {/* Example prompts */}
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Examples</p>
                        <div className="flex flex-col gap-1.5">
                            {EXAMPLES.map((example, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuery(example)}
                                    disabled={isSubmitting}
                                    className="text-left text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                                >
                                    &rarr; {example}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!query.trim() || isSubmitting}
                            className="gap-2"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</>
                            ) : (
                                <>Start Research <ArrowRight className="h-4 w-4" /></>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
