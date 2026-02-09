'use client';

/**
 * Inbox View Toggle
 *
 * Allows users to switch between Unified Inbox and Traditional Agent Chat views
 */

import { LayoutGrid, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useInboxStore, type ViewMode } from '@/lib/store/inbox-store';
import { cn } from '@/lib/utils';

interface InboxViewToggleProps {
    className?: string;
}

export function InboxViewToggle({ className }: InboxViewToggleProps) {
    const { viewMode, setViewMode } = useInboxStore((state) => ({
        viewMode: state.viewMode,
        setViewMode: state.setViewMode,
    }));

    const toggleView = (mode: ViewMode) => {
        setViewMode(mode);
    };

    return (
        <TooltipProvider>
            <div className={cn('flex items-center gap-1 bg-muted/50 rounded-lg p-1', className)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'inbox' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => toggleView('inbox')}
                            className={cn(
                                'h-8 px-3 gap-2 transition-all',
                                viewMode === 'inbox' && 'shadow-sm'
                            )}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs">Inbox</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Unified Inbox View</p>
                        <p className="text-xs text-muted-foreground">Thread-based conversations with artifacts</p>
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={viewMode === 'chat' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => toggleView('chat')}
                            className={cn(
                                'h-8 px-3 gap-2 transition-all',
                                viewMode === 'chat' && 'shadow-sm'
                            )}
                        >
                            <MessageSquare className="h-4 w-4" />
                            <span className="hidden sm:inline text-xs">Chat</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">Traditional Agent Chat</p>
                        <p className="text-xs text-muted-foreground">Direct conversation with your agents</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
}
