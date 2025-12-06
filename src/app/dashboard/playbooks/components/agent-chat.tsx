'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Mic, ChevronDown, Sparkles, Loader2, Play, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Types ---

export type MessageType = 'user' | 'agent';

export type ToolCallStatus = 'running' | 'completed' | 'failed';

export interface ToolCallStep {
    id: string;
    toolName: string;
    status: ToolCallStatus;
    durationMs?: number;
    result?: string;
    description: string;
}

export interface AgentThinking {
    isThinking: boolean;
    steps: ToolCallStep[];
    plan: string[]; // High level plan items like "Set cron", "Configure trigger"
}

export interface ChatMessage {
    id: string;
    type: MessageType;
    content: string;
    thinking?: AgentThinking; // Only for agent
    timestamp: Date;
    attachments?: string[]; // Filenames
}

export type ThinkingLevel = 'standard' | 'advanced' | 'expert' | 'genius';

// --- Components ---

function ThinkingBlock({ thinking }: { thinking: AgentThinking }) {
    const [expanded, setExpanded] = useState(true);

    if (!thinking.isThinking && thinking.steps.length === 0 && thinking.plan.length === 0) return null;

    const completedCount = thinking.steps.filter(s => s.status === 'completed').length;
    const isDone = !thinking.isThinking;

    return (
        <div className="mb-4 rounded-md border border-border/50 bg-muted/30 overflow-hidden text-sm">
            {/* Header */}
            <div
                className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2 flex-1">
                    {thinking.isThinking ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                    <span className="font-medium text-muted-foreground">
                        {thinking.isThinking ? 'Working...' : `Worked for ${(thinking.steps.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 1000).toFixed(1)}s`}
                    </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </div>

            {/* Content (Steps) */}
            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                    {/* High Level Plan */}
                    {thinking.plan.length > 0 && (
                        <div className="space-y-1">
                            {thinking.plan.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                                    <div className="mt-1.5 h-1 w-1 rounded-full bg-primary/50" />
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tool Calls */}
                    {thinking.steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-background/50 p-2 rounded border">
                            <Play className="h-3 w-3 text-blue-500" />
                            <span className="font-semibold text-foreground">{step.toolName}</span>
                            <span>{step.description}</span>
                            {step.durationMs && <span className="ml-auto text-muted-foreground/50">{step.durationMs}ms</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ModelSelector({ value, onChange }: { value: ThinkingLevel, onChange: (v: ThinkingLevel) => void }) {
    const options: Record<ThinkingLevel, { label: string, desc: string, icon: any }> = {
        standard: { label: 'Standard', desc: 'Fast & cost-effective (Haiku)', icon: Sparkles },
        advanced: { label: 'Advanced', desc: 'Complex logic (Sonnet)', icon: Sparkles },
        expert: { label: 'Expert', desc: 'Deep reasoning (Opus)', icon: Sparkles },
        genius: { label: 'Genius', desc: 'Maximum intelligence (Gemini 2)', icon: Sparkles },
    };

    const SelectedIcon = options[value].icon;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-medium border border-transparent hover:border-border hover:bg-background">
                    <SelectedIcon className="h-3 w-3 text-primary" />
                    {options[value].label}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px]">
                <DropdownMenuLabel>Intelligence Level</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(options) as [ThinkingLevel, typeof options['standard']][]).map(([key, opt]) => (
                    <DropdownMenuItem key={key} onClick={() => onChange(key)} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                            <span className="font-medium flex-1">{opt.label}</span>
                            {value === key && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground">{opt.desc}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function AgentChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            type: 'agent',
            content: "I'll help you build an automated agent. What would you like it to do?", // Starting prompt
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState<ThinkingLevel>('standard');
    const [isSimulating, setIsSimulating] = useState(false);

    // Simulation of "Agentic" behavior
    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsSimulating(true);

        // 1. Initial "Thinking" State
        const agentMsgId = (Date.now() + 1).toString();
        const initialAgentMsg: ChatMessage = {
            id: agentMsgId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: {
                isThinking: true,
                steps: [],
                plan: ['Analyze request', 'Identify required tools', 'Draft configuration']
            }
        };
        setMessages(prev => [...prev, initialAgentMsg]);

        // 2. Simulate Delays and Updates
        await new Promise(r => setTimeout(r, 1000));

        // Update 1: Tool Call
        setMessages(prev => prev.map(m => m.id === agentMsgId ? {
            ...m,
            thinking: {
                ...m.thinking!,
                steps: [{ id: 't1', toolName: 'search_knowledge', description: 'Searching for relevant integrations...', status: 'completed', durationMs: 450 }]
            }
        } : m));

        await new Promise(r => setTimeout(r, 1500));

        // Update 2: Another Tool Call + Plan Check
        setMessages(prev => prev.map(m => m.id === agentMsgId ? {
            ...m,
            thinking: {
                ...m.thinking!,
                steps: [
                    ...m.thinking!.steps,
                    { id: 't2', toolName: 'schema_builder', description: 'Generating automation schema', status: 'completed', durationMs: 820 }
                ]
            }
        } : m));

        await new Promise(r => setTimeout(r, 800));

        // 3. Final Comparison/Result
        setMessages(prev => prev.map(m => m.id === agentMsgId ? {
            ...m,
            content: "I can set that up. I'll need to know: **what triggers this automation?** (e.g. specific time, new email, form submission)",
            thinking: {
                ...m.thinking!,
                isThinking: false // Done
            }
        } : m));

        setIsSimulating(false);
    };

    return (
        <Card className="flex flex-col h-[600px] shadow-sm border-muted">
            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4 bg-slate-50/50">
                <div className="space-y-6 max-w-3xl mx-auto">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col gap-2", msg.type === 'user' ? "items-end" : "items-start")}>

                            {/* Thinking Block (Agent Only) */}
                            {msg.type === 'agent' && msg.thinking && (
                                <div className="w-full max-w-xl">
                                    <ThinkingBlock thinking={msg.thinking} />
                                </div>
                            )}

                            {/* Message Bubble */}
                            {msg.content && (
                                <div className={cn(
                                    "px-4 py-3 rounded-2xl max-w-xl text-sm leading-relaxed shadow-sm",
                                    msg.type === 'user'
                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                        : "bg-white border border-border/50 text-foreground rounded-tl-none"
                                )}>
                                    {msg.content}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Ghost element for scroll anchor if needed */}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-background border-t">
                <div className="max-w-3xl mx-auto bg-muted/20 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all p-3 space-y-3 shadow-inner">
                    <Textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Describe what you want the agent to do..."
                        className="min-h-[60px] border-0 bg-transparent resize-none p-0 focus-visible:ring-0 shadow-none text-base"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                    />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ModelSelector value={model} onChange={setModel} />

                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                                <Paperclip className="h-4 w-4" />
                            </Button>

                            <div className="h-4 w-px bg-border/50 mx-1" />

                            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground font-normal">
                                Allow Gmail access
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="icon"
                                className={cn("h-8 w-8 rounded-full transition-all", input.trim() ? "bg-primary" : "bg-muted text-muted-foreground")}
                                disabled={!input.trim() || isSimulating}
                                onClick={sendMessage}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-muted-foreground">AI can make mistakes. Verify critical automations.</p>
                </div>
            </div>
        </Card>
    );
}
