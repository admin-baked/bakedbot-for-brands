'use client';

/**
 * Inbox Conversation
 *
 * Chat interface adapted from PuffChat for inbox threads.
 * Handles message display, input, and artifact generation.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Send,
    Loader2,
    Bot,
    User,
    MoreHorizontal,
    Archive,
    Trash2,
    Edit2,
    Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useInboxStore } from '@/lib/store/inbox-store';
import type { ChatMessage } from '@/lib/store/agent-chat-store';
import type { InboxThread, InboxArtifact, InboxAgentPersona } from '@/types/inbox';
import { getThreadTypeLabel, getThreadTypeIcon } from '@/types/inbox';
import { InboxCarouselCard } from './artifacts/carousel-card';
import { InboxBundleCard } from './artifacts/bundle-card';
import { InboxCreativeCard } from './artifacts/creative-card';
import { formatDistanceToNow } from 'date-fns';
import { runInboxAgentChat, addMessageToInboxThread } from '@/server/actions/inbox';

// ============ Agent Name Mapping ============

const AGENT_NAMES: Record<InboxAgentPersona, { name: string; avatar: string }> = {
    // Field Agents
    smokey: { name: 'Smokey', avatar: '🌿' },
    money_mike: { name: 'Money Mike', avatar: '💰' },
    craig: { name: 'Craig', avatar: '📣' },
    ezal: { name: 'Ezal', avatar: '🔍' },
    deebo: { name: 'Deebo', avatar: '🛡️' },
    pops: { name: 'Pops', avatar: '📊' },
    day_day: { name: 'Day Day', avatar: '📦' },
    // Executive Agents
    leo: { name: 'Leo', avatar: '⚙️' },
    jack: { name: 'Jack', avatar: '📈' },
    linus: { name: 'Linus', avatar: '🖥️' },
    glenda: { name: 'Glenda', avatar: '✨' },
    // Auto-routing
    auto: { name: 'Assistant', avatar: '🤖' },
};

// ============ Props ============

interface InboxConversationProps {
    thread: InboxThread;
    artifacts: InboxArtifact[];
    className?: string;
}

// ============ Message Component ============

function MessageBubble({
    message,
    agentPersona,
    artifacts,
}: {
    message: ChatMessage;
    agentPersona: InboxAgentPersona;
    artifacts: InboxArtifact[];
}) {
    const isUser = message.type === 'user';
    const agent = AGENT_NAMES[agentPersona] || AGENT_NAMES.auto;

    // Find any artifacts associated with this message (by checking message content for artifact references)
    const messageArtifacts = artifacts.filter((a) =>
        message.content.includes(a.id) || message.artifacts?.some((ma) => ma.id === a.id)
    );

    return (
        <div className={cn('flex gap-3 py-4', isUser && 'flex-row-reverse')}>
            {/* Avatar */}
            <div
                className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm',
                    isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
            >
                {isUser ? <User className="h-4 w-4" /> : agent.avatar}
            </div>

            {/* Content */}
            <div className={cn('flex-1 max-w-[80%]', isUser && 'text-right')}>
                {/* Header */}
                <div className={cn('flex items-center gap-2 mb-1', isUser && 'flex-row-reverse')}>
                    <span className="text-sm font-medium">
                        {isUser ? 'You' : agent.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                    </span>
                </div>

                {/* Message Content */}
                <div
                    className={cn(
                        'rounded-lg px-4 py-3',
                        isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                    )}
                >
                    {message.thinking?.isThinking ? (
                        <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                        </div>
                    ) : (
                        <div className={cn('prose prose-sm max-w-none', isUser && 'prose-invert')}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Inline Artifact Cards */}
                {messageArtifacts.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {messageArtifacts.map((artifact) => (
                            <ArtifactPreviewCard key={artifact.id} artifact={artifact} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============ Artifact Preview Card ============

function ArtifactPreviewCard({ artifact }: { artifact: InboxArtifact }) {
    switch (artifact.type) {
        case 'carousel':
            return <InboxCarouselCard artifact={artifact} />;
        case 'bundle':
            return <InboxBundleCard artifact={artifact} />;
        case 'creative_content':
            return <InboxCreativeCard artifact={artifact} />;
        default:
            return null;
    }
}

// ============ Thread Header ============

function ThreadHeader({ thread }: { thread: InboxThread }) {
    const { archiveThread, deleteThread, updateThread } = useInboxStore();
    const agent = AGENT_NAMES[thread.primaryAgent] || AGENT_NAMES.auto;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                    <span className="text-lg">{agent.avatar}</span>
                </div>
                <div>
                    <h2 className="font-semibold">{thread.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5">
                            {getThreadTypeLabel(thread.type)}
                        </Badge>
                        <span>with {agent.name}</span>
                        {thread.status === 'draft' && (
                            <Badge variant="secondary" className="h-5 px-1.5 bg-yellow-100 text-yellow-700">
                                Has Drafts
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {/* TODO: Edit title */}}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Title
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => archiveThread(thread.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Thread
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => deleteThread(thread.id)}
                        className="text-destructive"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Thread
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

// ============ Main Component ============

export function InboxConversation({ thread, artifacts, className }: InboxConversationProps) {
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    const { addMessageToThread, addArtifacts } = useInboxStore();

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [thread.messages.length]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    // Poll for job completion
    useEffect(() => {
        if (!currentJobId) return;

        const pollJob = async () => {
            try {
                const response = await fetch(`/api/jobs/${currentJobId}`);
                if (!response.ok) return;

                const job = await response.json();

                if (job.status === 'completed' || job.status === 'failed') {
                    // Stop polling
                    if (pollingRef.current) {
                        clearInterval(pollingRef.current);
                        pollingRef.current = null;
                    }
                    setCurrentJobId(null);
                    setIsSubmitting(false);

                    if (job.status === 'completed' && job.result?.content) {
                        const agentMessage: ChatMessage = {
                            id: `msg-${Date.now()}`,
                            type: 'agent',
                            content: job.result.content,
                            timestamp: new Date(),
                        };
                        addMessageToThread(thread.id, agentMessage);
                    } else if (job.status === 'failed') {
                        const errorMessage: ChatMessage = {
                            id: `msg-${Date.now()}`,
                            type: 'agent',
                            content: `I encountered an error: ${job.error || 'Unknown error'}. Please try again.`,
                            timestamp: new Date(),
                        };
                        addMessageToThread(thread.id, errorMessage);
                    }
                }
            } catch (error) {
                console.error('Failed to poll job status:', error);
            }
        };

        // Start polling
        pollingRef.current = setInterval(pollJob, 1500);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, [currentJobId, thread.id, addMessageToThread]);

    const handleSubmit = async () => {
        if (!input.trim() || isSubmitting) return;

        const userMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            type: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        // Add user message to local state
        addMessageToThread(thread.id, userMessage);

        // Persist user message to server
        await addMessageToInboxThread(thread.id, userMessage);

        const messageContent = input.trim();
        setInput('');
        setIsSubmitting(true);

        try {
            // Call the inbox agent chat
            const result = await runInboxAgentChat(thread.id, messageContent);

            if (!result.success) {
                const errorMessage: ChatMessage = {
                    id: `msg-${Date.now()}`,
                    type: 'agent',
                    content: `I encountered an error: ${result.error || 'Unknown error'}. Please try again.`,
                    timestamp: new Date(),
                };
                addMessageToThread(thread.id, errorMessage);
                setIsSubmitting(false);
                return;
            }

            // If we got a job ID, start polling
            if (result.jobId) {
                setCurrentJobId(result.jobId);
                return;
            }

            // If we got an immediate response with message
            if (result.message) {
                addMessageToThread(thread.id, result.message);

                // Add any artifacts that were created
                if (result.artifacts && result.artifacts.length > 0) {
                    addArtifacts(result.artifacts);
                }
            }

            setIsSubmitting(false);
        } catch (error) {
            console.error('Failed to send message:', error);
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now()}`,
                type: 'agent',
                content: 'Sorry, I encountered an unexpected error. Please try again.',
                timestamp: new Date(),
            };
            addMessageToThread(thread.id, errorMessage);
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <ThreadHeader thread={thread} />

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 px-4">
                <div className="max-w-3xl mx-auto py-4">
                    {thread.messages.length === 0 ? (
                        <div className="text-center py-12">
                            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="font-medium text-lg mb-2">Start the conversation</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Describe what you'd like to create and {AGENT_NAMES[thread.primaryAgent]?.name || 'your assistant'} will help you build it.
                            </p>
                        </div>
                    ) : (
                        thread.messages.map((message) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                agentPersona={thread.primaryAgent}
                                artifacts={artifacts}
                            />
                        ))
                    )}

                    {isSubmitting && (
                        <div className="flex items-center gap-2 py-4 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Agent is thinking...</span>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4 bg-background">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message ${AGENT_NAMES[thread.primaryAgent]?.name || 'assistant'}...`}
                                className="min-h-[44px] max-h-[200px] resize-none pr-12"
                                rows={1}
                                disabled={isSubmitting}
                            />
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={!input.trim() || isSubmitting}
                            size="icon"
                            className="h-11 w-11"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
}

export default InboxConversation;
