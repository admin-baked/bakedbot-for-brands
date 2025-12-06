'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, ChevronDown, Sparkles, Loader2, Play, CheckCircle2, Bot, CalendarClock, Zap, Target, Laptop, Monitor, MousePointer2 } from 'lucide-react';
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
    subagentId?: string;
    isComputerUse?: boolean; // New: Flag for Computer Use
}

export interface AgentThinking {
    isThinking: boolean;
    steps: ToolCallStep[];
    plan: string[];
}

export interface ChatMessage {
    id: string;
    type: MessageType;
    content: string;
    thinking?: AgentThinking;
    timestamp: Date;
    attachments?: string[];
}

export type ThinkingLevel = 'standard' | 'advanced' | 'expert' | 'genius';

// --- Components ---

function ComputerUseBlock({ step }: { step: ToolCallStep }) {
    return (
        <div className="mt-2 mb-2 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden font-mono text-xs w-full max-w-md shadow-lg">
            {/* Fake Browser Chrome */}
            <div className="bg-slate-800 p-2 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 bg-slate-900 rounded px-2 py-0.5 text-slate-400 text-[10px] truncate">
                    {step.description.includes('Navigating') ? 'https://...' : 'remote-desktop://session-8291'}
                </div>
            </div>

            {/* Viewport content */}
            <div className="p-4 h-32 flex flex-col items-center justify-center text-slate-400 relative">
                <Monitor className="h-8 w-8 mb-2 opacity-50" />
                <span className="animate-pulse">{step.description}</span>

                {/* Cursor Simulation */}
                <MousePointer2 className="absolute top-1/2 left-1/3 h-4 w-4 text-white fill-white animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
        </div>
    );
}

function ThinkingBlock({ thinking }: { thinking: AgentThinking }) {
    const [expanded, setExpanded] = useState(true);

    if (!thinking.isThinking && thinking.steps.length === 0 && thinking.plan.length === 0) return null;

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
                        {thinking.isThinking ? 'Processing & Executing...' : `Completed in ${(thinking.steps.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 1000).toFixed(1)}s`}
                    </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </div>

            {/* Content (Steps) */}
            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                    {/* High Level Plan */}
                    {thinking.plan.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Target className="h-3 w-3" /> Execution Plan
                            </p>
                            {thinking.plan.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                                    <div className={cn("mt-1.5 h-1.5 w-1.5 rounded-full ", idx < thinking.steps.length ? "bg-green-500" : "bg-primary/40")} />
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tool Calls */}
                    {thinking.steps.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Log</p>
                            {thinking.steps.map((step) => (
                                <div key={step.id}>
                                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-background/50 p-2 rounded border">
                                        {step.subagentId ? <Bot className="h-3 w-3 text-purple-500" /> :
                                            step.isComputerUse ? <Laptop className="h-3 w-3 text-orange-500" /> :
                                                <Play className="h-3 w-3 text-blue-500" />}

                                        <span className="font-semibold text-foreground">
                                            {step.subagentId ? `Subagent: ${step.subagentId}` : step.toolName}
                                        </span>
                                        <span className="truncate flex-1">{step.description}</span>
                                        {step.durationMs && <span className="ml-auto text-muted-foreground/50">{step.durationMs}ms</span>}
                                    </div>

                                    {/* Render Computer Use View */}
                                    {step.isComputerUse && step.status === 'completed' && (
                                        <ComputerUseBlock step={step} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ModelSelector({ value, onChange }: { value: ThinkingLevel, onChange: (v: ThinkingLevel) => void }) {
    const options: Record<ThinkingLevel, { label: string, desc: string, icon: any }> = {
        standard: { label: 'Standard', desc: 'Fast & cost-effective', icon: Sparkles },
        advanced: { label: 'Advanced', desc: 'Complex logic', icon: Sparkles },
        expert: { label: 'Expert', desc: 'Deep reasoning', icon: Sparkles },
        genius: { label: 'Genius', desc: 'Maximum intelligence', icon: Sparkles },
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
            content: "I'm ready to handle complex workflows. I can connect to APIs, manage strategic goals, and even use a Computer to browse websites for you. What do you need?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState<ThinkingLevel>('standard');
    const [isSimulating, setIsSimulating] = useState(false);

    const runSimulation = async (userInput: string) => {
        const lowerInput = userInput.toLowerCase();
        const agentMsgId = (Date.now() + 1).toString();

        let plan: string[] = [];
        let steps: ToolCallStep[] = [];
        let responseText = "";

        if (lowerInput.includes('login') || lowerInput.includes('computer') || lowerInput.includes('browser')) {
            // Computer Use Simulation
            plan = ['Launch Remote Browser Session', 'Navigate to Target Site', 'Perform Login Sequence', 'Extract Data'];
            steps = [
                { id: 't1', toolName: 'computer_use.launch', description: 'Initializing secure browser...', status: 'completed', durationMs: 1200, isComputerUse: true },
                { id: 't2', toolName: 'computer_use.interact', description: 'Navigating to portal.login...', status: 'completed', durationMs: 2500, isComputerUse: true },
                { id: 't3', toolName: 'computer_use.type', description: 'Typing credentials for user...', status: 'completed', durationMs: 800, isComputerUse: true }
            ];
            responseText = "I've successfully logged into the portal and extracted the latest report. I saved the session credentials to your Keychain for future use.";
        } else if (lowerInput.includes('connect') || lowerInput.includes('mcp') || lowerInput.includes('stripe')) {
            // Integration Simulation
            const toolName = lowerInput.includes('stripe') ? 'Stripe' : 'MCP Server';
            plan = [`Connect to ${toolName} API`, 'Authenticate via OAuth', 'Install App Store Integration', 'Register Webhooks'];
            steps = [
                { id: 't1', toolName: 'mcp.connect', description: `Handshaking with ${toolName}...`, status: 'completed', durationMs: 450 },
                { id: 't2', toolName: 'app.install', description: `Installing '${toolName} Integration' to App Store...`, status: 'completed', durationMs: 1100 }
            ];
            responseText = `I've connected to **${toolName}**. \n\nI also installed the **${toolName} App** in your dashboard so you can manage settings there. I'm now listening for webhooks from this source.`;
        } else {
            // Default Strategy Simulation (Retail/Wholesale)
            const isWholesale = lowerInput.includes('wholesale');
            plan = isWholesale
                ? ['Objective: Optimize Wholesale Pricing', 'Analyze Competitors', 'Update Rules']
                : ['Objective: Grow Retail Margins', 'Scan Competitors', 'Optimize Menu'];
            steps = [
                { id: 't1', toolName: 'analyze_data', description: 'Analyzing margins...', status: 'completed', durationMs: 450 },
                { id: 't2', subagentId: 'Researcher', toolName: 'delegate', description: 'Scanning competitors...', status: 'completed', durationMs: 2500 },
                { id: 't3', toolName: 'optimize', description: 'Adjusting pricing rules...', status: 'completed', durationMs: 800 }
            ];
            responseText = isWholesale
                ? "I've optimized your **Wholesale Pricing** based on market gaps."
                : "I've started the **Margin Growth Campaign** and adjusted 3 SKUs.";
        }

        const initialAgentMsg: ChatMessage = {
            id: agentMsgId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: {
                isThinking: true,
                steps: [],
                plan: plan
            }
        };
        setMessages(prev => [...prev, initialAgentMsg]);

        // Simulating the steps sequentially
        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
            const currentSteps = steps.slice(0, i + 1);
            setMessages(prev => prev.map(m => m.id === agentMsgId ? {
                ...m,
                thinking: {
                    ...m.thinking!,
                    steps: currentSteps
                }
            } : m));
        }

        await new Promise(r => setTimeout(r, 800));
        setMessages(prev => prev.map(m => m.id === agentMsgId ? {
            ...m,
            content: responseText,
            thinking: {
                ...m.thinking!,
                isThinking: false
            }
        } : m));

        setIsSimulating(false);
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsSimulating(true);
        await runSimulation(input);
    };

    return (
        <Card className="flex flex-col h-[600px] shadow-sm border-muted">
            <ScrollArea className="flex-1 p-4 bg-slate-50/50">
                <div className="space-y-6 max-w-3xl mx-auto">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex flex-col gap-2", msg.type === 'user' ? "items-end" : "items-start")}>
                            {msg.type === 'agent' && msg.thinking && (
                                <div className="w-full max-w-xl">
                                    <ThinkingBlock thinking={msg.thinking} />
                                </div>
                            )}
                            {msg.content && (
                                <div className={cn("px-4 py-3 rounded-2xl max-w-xl text-sm leading-relaxed shadow-sm", msg.type === 'user' ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white border border-border/50 text-foreground rounded-tl-none")}>
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="p-4 bg-background border-t">
                <div className="max-w-3xl mx-auto bg-muted/20 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all p-3 space-y-3 shadow-inner">
                    <Textarea
                        value={input} onChange={e => setInput(e.target.value)}
                        placeholder="Try: 'Log into Shopify' or 'Connect Stripe'"
                        className="min-h-[60px] border-0 bg-transparent resize-none p-0 focus-visible:ring-0 shadow-none text-base"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ModelSelector value={model} onChange={setModel} />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"><Paperclip className="h-4 w-4" /></Button>
                            <div className="h-4 w-px bg-border/50 mx-1" />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                                <CalendarClock className="h-3 w-3" />
                                <span>Triggers</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 border-l border-border/50">
                                <Bot className="h-3 w-3" />
                                <span>Subagents</span>
                            </div>
                        </div>
                        <Button size="icon" className={cn("h-8 w-8 rounded-full transition-all", input.trim() ? "bg-primary" : "bg-muted text-muted-foreground")} disabled={!input.trim() || isSimulating} onClick={sendMessage}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="text-center mt-2"><p className="text-[10px] text-muted-foreground">AI can make mistakes. Verify critical automations.</p></div>
            </div>
        </Card>
    );
}
