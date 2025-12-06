
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Send,
    Bot,
    User,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Paperclip,
    Zap,
    Lock,
    ChevronDown,
    Search,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPER_ADMIN_SMOKEY } from '@/config/super-admin-smokey-config';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    toolCalls?: ToolCall[];
    isThinking?: boolean;
}

interface ToolCall {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    agent?: string;
    result?: string;
}

export default function AgentInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Add thinking message
        const thinkingId = `thinking-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: thinkingId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isThinking: true,
            toolCalls: [
                { id: '1', name: 'Analyzing intent...', status: 'running' }
            ]
        }]);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: userMessage.content,
                    isSuperAdmin: true,
                    context: 'internal',
                }),
            });

            const data = await response.json();

            // Replace thinking with actual response
            setMessages(prev => prev.map(m =>
                m.id === thinkingId
                    ? {
                        ...m,
                        content: data.message || data.response || 'I processed your request.',
                        isThinking: false,
                        toolCalls: data.toolCalls || undefined,
                    }
                    : m
            ));
        } catch (error) {
            setMessages(prev => prev.map(m =>
                m.id === thinkingId
                    ? {
                        ...m,
                        content: 'Sorry, I encountered an error. Please check your connection.',
                        isThinking: false,
                    }
                    : m
            ));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto w-full p-4 space-y-6">

            {/* Input / Control Center (Modeled after screenshot) */}
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-300 to-emerald-400 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur-sm"></div>
                <Card className="relative border-emerald-100/50 shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                        {/* Status / Header Text */}
                        <div className="px-5 pt-5 pb-2">
                            <h2 className="text-emerald-800 font-medium text-lg">
                                I'm ready to handle complex workflows.
                            </h2>
                            <p className="text-emerald-600/80 text-sm mt-1">
                                Try: 'Automate weekly report download' or 'Log into Shopify'
                            </p>
                        </div>

                        {/* Input Area */}
                        <div className="px-4 py-2">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder=""
                                className="min-h-[60px] border-0 focus-visible:ring-0 resize-none text-base shadow-none bg-transparent placeholder:text-muted-foreground/40"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-4 pb-3 border-t border-emerald-50 bg-emerald-50/10 pt-2">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="sm" className="h-8 gap-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg">
                                    <Sparkles className="h-4 w-4" />
                                    <span className="text-xs font-medium">Standard</span>
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>

                                <div className="h-4 w-[1px] bg-border/50" />

                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                                    <Paperclip className="h-4 w-4" />
                                </Button>

                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground rounded-lg">
                                    <Zap className="h-3.5 w-3.5" />
                                    <span className="text-xs">Triggers</span>
                                </Button>

                                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground rounded-lg">
                                    <Lock className="h-3.5 w-3.5" />
                                    <span className="text-xs">Vault</span>
                                </Button>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                                className={cn(
                                    "h-9 w-9 rounded-xl transition-all duration-300",
                                    input.trim() ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200" : "bg-muted text-muted-foreground"
                                )}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <div className="text-center mt-3">
                    <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                        AI can make mistakes. Verify critical automations.
                    </p>
                </div>
            </div>

            {/* Tools and Updates Output Area */}
            <div className="flex-1 min-h-0 bg-background/50 rounded-xl border border-border/40 backdrop-blur-sm p-1">
                <ScrollArea className="h-full px-4 py-4">
                    <div className="space-y-6">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 py-12">
                                <Bot className="h-12 w-12 mb-4 opacity-20" />
                                <p className="text-sm">Agent output stream is ready.</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div key={message.id} className={cn("flex gap-4 group", message.role === 'user' ? "flex-row-reverse" : "")}>
                                    {/* Avatar */}
                                    <div className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm",
                                        message.role === 'assistant' ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-primary"
                                    )}>
                                        {message.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                    </div>

                                    {/* Content */}
                                    <div className={cn(
                                        "flex-1 max-w-[85%] space-y-2",
                                        message.role === 'user' ? "items-end" : "items-start"
                                    )}>
                                        <div className={cn(
                                            "rounded-2xl px-5 py-3 text-sm shadow-sm",
                                            message.role === 'user'
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-white dark:bg-zinc-900 border border-border/50 rounded-tl-sm"
                                        )}>
                                            {message.isThinking ? (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    <span className="text-xs">Processing workflow...</span>
                                                </div>
                                            ) : (
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tools / Updates attached to Assistant Message */}
                                        {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
                                            <div className="w-full pl-2">
                                                <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                                        <Search className="h-3 w-3" /> Tool Executions
                                                    </p>
                                                    {message.toolCalls.map(tool => (
                                                        <div key={tool.id} className="flex items-center justify-between text-xs bg-background/50 p-2 rounded border border-border/30">
                                                            <div className="flex items-center gap-2">
                                                                {tool.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
                                                                {tool.status === 'success' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                                                {tool.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                <span className="font-medium">{tool.name}</span>
                                                            </div>
                                                            {tool.agent && <Badge variant="secondary" className="text-[10px] h-5">{tool.agent}</Badge>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
