'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import type { ChatMessage } from '@/lib/store/agent-chat-store';
import { resolveCustomerDisplayName } from '@/lib/customers/profile-derivations';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { CustomerProfile } from '@/types/customers';
import {
    addMessageToInboxThread,
    createInboxThread,
    getInboxThread,
    getInboxThreads,
    runInboxAgentChat,
} from '@/server/actions/inbox';

interface CustomerChatDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CustomerProfile;
}

function normalizeMessage(message: ChatMessage | null | undefined): ChatMessage | null {
    if (!message) {
        return null;
    }

    return {
        ...message,
        timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
    };
}

function normalizeMessages(messages: ChatMessage[] | undefined): ChatMessage[] {
    return (messages ?? []).map((message) => normalizeMessage({
        ...message,
        type: message.type || ((message as unknown as { role?: string }).role === 'user' ? 'user' : 'agent'),
    })).filter((message): message is ChatMessage => message !== null);
}

export function CustomerChatDialog({ open, onOpenChange, customer }: CustomerChatDialogProps) {
    const { toast } = useToast();
    const [loadingThread, setLoadingThread] = useState(false);
    const [sending, setSending] = useState(false);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [loadedCustomerId, setLoadedCustomerId] = useState<string | null>(null);

    const customerName = useMemo(() => resolveCustomerDisplayName({
        displayName: customer.displayName,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        fallbackId: customer.id,
    }), [customer.displayName, customer.email, customer.firstName, customer.id, customer.lastName]);

    useEffect(() => {
        if (!open || loadedCustomerId === customer.id) {
            return;
        }

        let cancelled = false;

        async function loadThread() {
            setLoadingThread(true);
            setThreadId(null);
            setMessages([]);
            try {
                const threadsResult = await getInboxThreads({
                    type: 'crm_customer',
                    orgId: customer.orgId,
                    limit: 50,
                });

                if (!threadsResult.success) {
                    throw new Error(threadsResult.error || 'Could not load CRM chat threads');
                }

                const existingThread = threadsResult.threads?.find((thread) => thread.customerId === customer.id) ?? null;
                const resolvedThreadId = existingThread?.id ?? (await createInboxThread({
                    type: 'crm_customer',
                    title: `${customerName} - CRM`,
                    brandId: customer.orgId,
                    dispensaryId: customer.orgId,
                    customerId: customer.id,
                    customerEmail: customer.email,
                    customerSegment: customer.segment,
                })).thread?.id ?? null;

                if (!resolvedThreadId) {
                    throw new Error('Could not initialize CRM chat thread');
                }

                const threadResult = await getInboxThread(resolvedThreadId);
                if (!threadResult.success || !threadResult.thread) {
                    throw new Error(threadResult.error || 'Could not load CRM chat thread');
                }

                if (cancelled) {
                    return;
                }

                setThreadId(resolvedThreadId);
                setMessages(normalizeMessages(threadResult.thread.messages));
                setLoadedCustomerId(customer.id);
            } catch (error) {
                if (!cancelled) {
                    toast({
                        variant: 'destructive',
                        title: 'Chat unavailable',
                        description: error instanceof Error ? error.message : 'Could not open the CRM chat.',
                    });
                }
            } finally {
                if (!cancelled) {
                    setLoadingThread(false);
                }
            }
        }

        loadThread();

        return () => {
            cancelled = true;
        };
    }, [customer.email, customer.id, customer.orgId, customer.segment, customerName, loadedCustomerId, open, toast]);

    useEffect(() => {
        if (!open) {
            setDraft('');
        }
    }, [open]);

    const handleSend = async () => {
        const trimmed = draft.trim();
        if (!trimmed || !threadId || sending) {
            return;
        }

        const optimisticMessage: ChatMessage = {
            id: `crm-user-${Date.now()}`,
            type: 'user',
            content: trimmed,
            timestamp: new Date(),
        };

        const previousMessages = messages;
        setMessages((current) => [...current, optimisticMessage]);
        setDraft('');
        setSending(true);

        try {
            const saveResult = await addMessageToInboxThread(threadId, optimisticMessage);
            if (!saveResult.success) {
                throw new Error(saveResult.error || 'Could not save your message');
            }

            const agentResult = await runInboxAgentChat(threadId, trimmed);
            if (!agentResult.success) {
                throw new Error(agentResult.error || 'Could not get a CRM response');
            }

            const agentMessage = normalizeMessage(agentResult.message);
            if (agentMessage) {
                setMessages((current) => [...current, agentMessage]);
            }
        } catch (error) {
            setMessages(previousMessages);
            setDraft(trimmed);
            toast({
                variant: 'destructive',
                title: 'Message failed',
                description: error instanceof Error ? error.message : 'Could not send the CRM chat message.',
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col overflow-hidden p-0 gap-0">
                <div className="px-6 py-5">
                    <DialogHeader className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <DialogTitle>Chat About {customerName}</DialogTitle>
                                <DialogDescription>
                                    Ask CRM questions, draft outreach, or summarize this customer without leaving the profile.
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="capitalize">{customer.segment.replace('_', ' ')}</Badge>
                                {threadId && (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/inbox?thread=${threadId}`}>Open in Inbox</Link>
                                    </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                </div>
                <Separator />

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {loadingThread ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Loading CRM chat...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                            <MessageSquare className="mb-3 h-10 w-10 opacity-40" />
                            <p className="font-medium">No CRM chat yet</p>
                            <p className="text-sm">Start the conversation with a question about this customer.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                                            message.type === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-foreground'
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">{message.content}</div>
                                        <div className={`mt-2 text-[11px] ${message.type === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                            {new Date(message.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Separator />
                <div className="px-6 py-5">
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Ask about this customer's history, playbooks, or next best message..."
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            rows={4}
                            disabled={sending || loadingThread}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleSend} disabled={!draft.trim() || sending || loadingThread || !threadId}>
                                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
