'use client';

/**
 * Inbox Conversation
 *
 * Chat interface adapted from PuffChat for inbox threads.
 * Handles message display, input, and artifact generation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    RefreshCw,
} from 'lucide-react';
import { MessageBubble as SharedMessageBubble } from '@/components/dashboard/agentic/message-bubble';
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
import { InboxQRCodeCard } from './artifacts/qr-code-card';
import { InboxTaskFeed, AGENT_PULSE_CONFIG } from './inbox-task-feed';
import { AgentHandoffNotification } from './agent-handoff-notification';
import { formatDistanceToNow } from 'date-fns';
import { runInboxAgentChat, addMessageToInboxThread } from '@/server/actions/inbox';
import { useJobPoller } from '@/hooks/use-job-poller';

// ============ Agent Name Mapping ============

const AGENT_NAMES: Record<InboxAgentPersona, {
    name: string;
    avatar: string;
    color: string;
    bgColor: string;
    ringColor: string;
}> = {
    // Field Agents
    smokey: { name: 'Smokey', avatar: '🌿', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', ringColor: 'ring-emerald-500/50' },
    money_mike: { name: 'Money Mike', avatar: '💰', color: 'text-amber-500', bgColor: 'bg-amber-500/10', ringColor: 'ring-amber-500/50' },
    craig: { name: 'Craig', avatar: '📣', color: 'text-blue-500', bgColor: 'bg-blue-500/10', ringColor: 'ring-blue-500/50' },
    ezal: { name: 'Ezal', avatar: '🔍', color: 'text-purple-500', bgColor: 'bg-purple-500/10', ringColor: 'ring-purple-500/50' },
    deebo: { name: 'Deebo', avatar: '🛡️', color: 'text-red-500', bgColor: 'bg-red-500/10', ringColor: 'ring-red-500/50' },
    pops: { name: 'Pops', avatar: '📊', color: 'text-orange-500', bgColor: 'bg-orange-500/10', ringColor: 'ring-orange-500/50' },
    day_day: { name: 'Day Day', avatar: '📦', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', ringColor: 'ring-cyan-500/50' },
    mrs_parker: { name: 'Mrs. Parker', avatar: '💜', color: 'text-pink-500', bgColor: 'bg-pink-500/10', ringColor: 'ring-pink-500/50' },
    big_worm: { name: 'Big Worm', avatar: '🐛', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', ringColor: 'ring-indigo-500/50' },
    roach: { name: 'Roach', avatar: '📚', color: 'text-teal-500', bgColor: 'bg-teal-500/10', ringColor: 'ring-teal-500/50' },
    // Executive Agents
    leo: { name: 'Leo', avatar: '⚙️', color: 'text-slate-400', bgColor: 'bg-slate-500/10', ringColor: 'ring-slate-500/50' },
    jack: { name: 'Jack', avatar: '📈', color: 'text-violet-500', bgColor: 'bg-violet-500/10', ringColor: 'ring-violet-500/50' },
    linus: { name: 'Linus', avatar: '🖥️', color: 'text-sky-500', bgColor: 'bg-sky-500/10', ringColor: 'ring-sky-500/50' },
    glenda: { name: 'Glenda', avatar: '✨', color: 'text-rose-500', bgColor: 'bg-rose-500/10', ringColor: 'ring-rose-500/50' },
    mike: { name: 'Mike', avatar: '💵', color: 'text-lime-500', bgColor: 'bg-lime-500/10', ringColor: 'ring-lime-500/50' },
    // Auto-routing
    auto: { name: 'Assistant', avatar: '🤖', color: 'text-primary', bgColor: 'bg-primary/10', ringColor: 'ring-primary/50' },
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
        <SharedMessageBubble
            isUser={isUser}
            name={isUser ? 'You' : agent.name}
            role={!isUser ? agentPersona : undefined} // Or mapped role if available
            avatarSrc={undefined} // No src for emojis in this current setup, or could use agent.avatar if image
            avatarFallback={isUser ? <User className="h-4 w-4" /> : <span className="text-base">{agent.avatar}</span>} // Handling custom fallback for emojis
            timestamp={formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            className={isUser ? 'flex-row-reverse' : ''}
            content={
                <>
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
                    {/* Inline Artifact Cards */}
                    {messageArtifacts.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {messageArtifacts.map((artifact) => (
                                <ArtifactPreviewCard key={artifact.id} artifact={artifact} />
                            ))}
                        </div>
                    )}
                </>
            }
        />
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
        case 'qr_code':
            return <InboxQRCodeCard artifact={artifact} />;
        default:
            return null;
    }
}

// ============ Thread Header ============

function ThreadHeader({ thread }: { thread: InboxThread }) {
    const { archiveThread, deleteThread, updateThread } = useInboxStore();
    const agent = AGENT_NAMES[thread.primaryAgent] || AGENT_NAMES.auto;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3">
                {/* Agent Avatar with colored ring */}
                <div className={cn(
                    'p-2 rounded-xl ring-2 ring-offset-2 ring-offset-background',
                    agent.bgColor,
                    agent.ringColor
                )}>
                    <span className="text-xl">{agent.avatar}</span>
                </div>
                <div>
                    <h2 className="font-semibold">{thread.title}</h2>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 border-white/10">
                            {getThreadTypeLabel(thread.type)}
                        </Badge>
                        <span>with <span className={agent.color}>{agent.name}</span></span>
                        {thread.status === 'draft' && (
                            <Badge variant="secondary" className="h-5 px-1.5 bg-amber-500/10 text-amber-500 border-amber-500/20">
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
                    <DropdownMenuItem onClick={() => {/* TODO: Edit title */ }}>
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

            {/* Persistent Task Feed - Always visible when agent is processing */}
            <AnimatePresence>
                {isSubmitting && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="sticky top-0 z-10 px-4 pt-3 pb-2 bg-gradient-to-b from-background to-background/80 backdrop-blur-md border-b border-white/5"
                    >
                        <div className="max-w-3xl mx-auto">
                            <InboxTaskFeed
                                agentPersona={thread.primaryAgent}
                                isRunning={isSubmitting}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                        <>
                            {thread.messages.map((message, index) => {
                                // Check if there's a handoff before this message
                                const handoffBefore = thread.handoffHistory?.find((handoff) => {
                                    const handoffTime = new Date(handoff.timestamp).getTime();
                                    const messageTime = new Date(message.timestamp).getTime();
                                    const prevMessageTime = index > 0
                                        ? new Date(thread.messages[index - 1].timestamp).getTime()
                                        : 0;
                                    return handoffTime > prevMessageTime && handoffTime <= messageTime;
                                });

                                return (
                                    <React.Fragment key={message.id}>
                                        {/* Show handoff notification if one occurred before this message */}
                                        {handoffBefore && (
                                            <div className="my-4">
                                                <AgentHandoffNotification handoff={handoffBefore} />
                                            </div>
                                        )}
                                        <MessageBubble
                                            message={message}
                                            agentPersona={thread.primaryAgent}
                                            artifacts={artifacts}
                                        />
                                    </React.Fragment>
                                );
                            })}
                        </>
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
