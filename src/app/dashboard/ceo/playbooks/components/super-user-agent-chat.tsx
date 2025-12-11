'use client';

/**
 * Super User Agent Chat
 * 
 * Enhanced agent command interface for internal BakedBot operations.
 * Extends the standard AgentChat with Super User specific features:
 * - Access to all tools (including admin tools)
 * - Competitor research capabilities
 * - Customer email automation
 * - Internal reporting
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
    Paperclip,
    Send,
    ChevronDown,
    Sparkles,
    Loader2,
    Play,
    CheckCircle2,
    Bot,
    CalendarClock,
    Target,
    Laptop,
    Monitor,
    MousePointer2,
    Save,
    FileCode,
    Copy,
    Download,
    Key,
    Mail,
    BarChart3,
    Shield,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- Types ---

export type MessageType = 'user' | 'agent';
export type ToolCallStatus = 'running' | 'completed' | 'failed';
export type ArtifactType = 'code' | 'yaml' | 'report' | 'table' | 'email';

export interface ChatArtifact {
    id: string;
    type: ArtifactType;
    title: string;
    content: string;
    language?: string;
}

export interface ToolCallStep {
    id: string;
    toolName: string;
    status: ToolCallStatus;
    durationMs?: number;
    result?: string;
    description: string;
    subagentId?: string;
    isComputerUse?: boolean;
    isAdminTool?: boolean;
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
    artifact?: ChatArtifact;
    canSaveAsPlaybook?: boolean;
}

export type ThinkingLevel = 'standard' | 'advanced' | 'expert' | 'genius';

// --- Artifact Components ---

function YamlArtifact({ artifact }: { artifact: ChatArtifact }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(artifact.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-3 rounded-lg border border-border bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-slate-300 font-medium">{artifact.title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-white" onClick={handleCopy}>
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-white">
                        <Download className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
            <pre className="p-3 text-xs text-green-300 font-mono overflow-x-auto max-h-48">
                <code>{artifact.content}</code>
            </pre>
        </div>
    );
}

function ReportArtifact({ artifact }: { artifact: ChatArtifact }) {
    return (
        <div className="mt-3 rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{artifact.title}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Download className="h-3.5 w-3.5" />
                </Button>
            </div>
            <div className="p-4 text-sm whitespace-pre-wrap">
                {artifact.content}
            </div>
        </div>
    );
}

function EmailArtifact({ artifact }: { artifact: ChatArtifact }) {
    return (
        <div className="mt-3 rounded-lg border border-border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">{artifact.title}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                    <Send className="h-3.5 w-3.5" />
                    Send
                </Button>
            </div>
            <div className="p-4 text-sm whitespace-pre-wrap">
                {artifact.content}
            </div>
        </div>
    );
}

// --- Thinking Block ---

function ThinkingBlock({ thinking }: { thinking: AgentThinking }) {
    const [expanded, setExpanded] = useState(true);
    if (!thinking.isThinking && thinking.steps.length === 0 && thinking.plan.length === 0) return null;

    return (
        <div className="mb-4 rounded-md border border-border/50 bg-muted/30 overflow-hidden text-sm">
            <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-2 flex-1">
                    {thinking.isThinking ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    <span className="font-medium text-muted-foreground">
                        {thinking.isThinking ? 'Processing...' : `Completed in ${(thinking.steps.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 1000).toFixed(1)}s`}
                    </span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </div>

            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                    {thinking.plan.length > 0 && (
                        <div className="space-y-2 mb-4">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Target className="h-3 w-3" /> Execution Plan
                            </p>
                            {thinking.plan.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                                    <div className={cn("mt-1.5 h-1.5 w-1.5 rounded-full", idx < thinking.steps.length ? "bg-green-500" : "bg-primary/40")} />
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {thinking.steps.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Log</p>
                            {thinking.steps.map((step) => (
                                <div key={step.id} className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-background/50 p-2 rounded border">
                                    {step.subagentId ? <Bot className="h-3 w-3 text-purple-500" /> :
                                        step.isAdminTool ? <Shield className="h-3 w-3 text-red-500" /> :
                                            step.isComputerUse ? <Laptop className="h-3 w-3 text-orange-500" /> :
                                                <Play className="h-3 w-3 text-blue-500" />}
                                    <span className="font-semibold text-foreground">
                                        {step.subagentId ? `Agent: ${step.subagentId}` : step.toolName}
                                    </span>
                                    <span className="truncate flex-1">{step.description}</span>
                                    {step.durationMs && <span className="ml-auto text-muted-foreground/50">{step.durationMs}ms</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Model Selector ---

function ModelSelector({ value, onChange }: { value: ThinkingLevel, onChange: (v: ThinkingLevel) => void }) {
    const options: Record<ThinkingLevel, { label: string, desc: string }> = {
        standard: { label: 'Standard', desc: 'Fast & cost-effective' },
        advanced: { label: 'Advanced', desc: 'Complex logic' },
        expert: { label: 'Expert', desc: 'Deep reasoning' },
        genius: { label: 'Genius', desc: 'Maximum intelligence' },
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-medium border border-transparent hover:border-border hover:bg-background">
                    <Sparkles className="h-3 w-3 text-primary" />
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

// --- Triggers Modal ---

function TriggersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Automation Triggers</DialogTitle>
                    <DialogDescription>
                        Configure when this automation should run automatically.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Schedule (Cron Expression)</Label>
                        <Input placeholder="0 9 * * 1-5" />
                        <p className="text-xs text-muted-foreground">
                            Example: Run every weekday at 9 AM
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>Event Trigger</Label>
                        <Input placeholder="new_signup, order_completed" />
                        <p className="text-xs text-muted-foreground">
                            Comma-separated list of events that trigger this automation
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={onClose}>Save Triggers</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Vault Modal ---

function VaultModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Secure Vault</DialogTitle>
                    <DialogDescription>
                        Manage credentials for automated logins and API integrations.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">AIQ Portal</p>
                                <p className="text-xs text-muted-foreground">Login credentials</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">SendGrid API</p>
                                <p className="text-xs text-muted-foreground">Email automation</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">Edit</Button>
                    </div>
                    <Button variant="outline" className="w-full gap-2">
                        <Key className="h-4 w-4" />
                        Add New Credential
                    </Button>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- Main Component ---

export function SuperUserAgentChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [model, setModel] = useState<ThinkingLevel>('advanced');
    const [isSimulating, setIsSimulating] = useState(false);
    const [showTriggers, setShowTriggers] = useState(false);
    const [showVault, setShowVault] = useState(false);

    // Listen for quick action commands
    useEffect(() => {
        const handler = (e: CustomEvent<{ command: string }>) => {
            setInput(e.detail.command);
        };
        window.addEventListener('agent-command', handler as EventListener);
        return () => window.removeEventListener('agent-command', handler as EventListener);
    }, []);

    const runSimulation = async (userInput: string) => {
        const lowerInput = userInput.toLowerCase();
        const agentMsgId = (Date.now() + 1).toString();

        let plan: string[] = [];
        let steps: ToolCallStep[] = [];
        let responseText = "";
        let artifact: ChatArtifact | undefined;
        let canSaveAsPlaybook = false;

        if (lowerInput.includes('welcome email') || lowerInput.includes('signup')) {
            plan = ['Query New Signups', 'Generate Personalized Emails', 'Send via SendGrid', 'Log Results'];
            steps = [
                { id: 't1', toolName: 'firestore.query', description: 'Fetching new signups from today...', status: 'completed', durationMs: 350, isAdminTool: true },
                { id: 't2', subagentId: 'Craig', toolName: 'delegate', description: 'Generating personalized welcome emails...', status: 'completed', durationMs: 2200 },
                { id: 't3', toolName: 'sendgrid.send', description: 'Sending 12 welcome emails...', status: 'completed', durationMs: 1500 },
                { id: 't4', toolName: 'analytics.log', description: 'Logging email campaign results...', status: 'completed', durationMs: 200 },
            ];
            responseText = "✅ **Welcome Email Campaign Complete**\n\nSent personalized welcome emails to **12 new signups** from today.";
            artifact = {
                id: 'email-1',
                type: 'email',
                title: 'Sample Welcome Email',
                content: `Subject: Welcome to BakedBot! 🌿

Hi {{customer.name}},

Thanks for joining BakedBot! We're excited to help you grow your cannabis business.

Here's what you can do next:
• Complete your brand profile
• Connect your first dispensary
• Set up automated campaigns

Questions? Just reply to this email.

Cheers,
The BakedBot Team`,
            };
            canSaveAsPlaybook = true;

        } else if (lowerInput.includes('competitor') || lowerInput.includes('aiq') || lowerInput.includes('research')) {
            plan = ['Access AIQ Portal', 'Scrape Pricing Data', 'Analyze Competitor Features', 'Generate Report'];
            steps = [
                { id: 't1', toolName: 'vault.getCredential', description: 'Retrieving AIQ login credentials...', status: 'completed', durationMs: 150 },
                { id: 't2', toolName: 'computer_use.login', description: 'Logging into AIQ portal...', status: 'completed', durationMs: 3500, isComputerUse: true },
                { id: 't3', toolName: 'computer_use.scrape', description: 'Extracting pricing information...', status: 'completed', durationMs: 4200, isComputerUse: true },
                { id: 't4', subagentId: 'Pops', toolName: 'delegate', description: 'Analyzing competitive landscape...', status: 'completed', durationMs: 2800 },
            ];
            responseText = "📊 **Competitor Analysis Complete**\n\nI've analyzed AIQ's current pricing and features.";
            artifact = {
                id: 'report-1',
                type: 'report',
                title: 'AIQ Competitor Analysis',
                content: `## AIQ Pricing Analysis
Date: ${new Date().toLocaleDateString()}

### Pricing Tiers
- Starter: $299/mo (vs BakedBot $199/mo) ✅ 33% cheaper
- Growth: $599/mo (vs BakedBot $399/mo) ✅ 33% cheaper  
- Enterprise: $1,499/mo (vs BakedBot $999/mo) ✅ 33% cheaper

### Feature Comparison
| Feature | AIQ | BakedBot |
|---------|-----|----------|
| AI Agents | ❌ | ✅ 6 agents |
| Multi-tenant | Limited | ✅ Full |
| Compliance | Basic | ✅ Advanced |
| Analytics | ✅ | ✅ + AI Insights |

### Recommendation
Position BakedBot as the cost-effective AI-first alternative.`,
            };
            canSaveAsPlaybook = true;

        } else if (lowerInput.includes('weekly') || lowerInput.includes('report')) {
            plan = ['Aggregate Platform Metrics', 'Query Revenue Data', 'Compile Agent Performance', 'Generate Report'];
            steps = [
                { id: 't1', toolName: 'firestore.aggregate', description: 'Aggregating weekly platform metrics...', status: 'completed', durationMs: 800, isAdminTool: true },
                { id: 't2', toolName: 'stripe.query', description: 'Fetching revenue data...', status: 'completed', durationMs: 600 },
                { id: 't3', subagentId: 'Pops', toolName: 'delegate', description: 'Analyzing agent performance...', status: 'completed', durationMs: 1500 },
                { id: 't4', toolName: 'report.generate', description: 'Compiling weekly report...', status: 'completed', durationMs: 400 },
            ];
            responseText = "📈 **Weekly Report Generated**\n\nHere's your platform summary for this week:";
            artifact = {
                id: 'report-2',
                type: 'report',
                title: 'Weekly Platform Report',
                content: `## BakedBot Weekly Report
Week of ${new Date().toLocaleDateString()}

### Revenue
- MRR: $47,850 (+12% WoW)
- New Subscriptions: 8
- Churn: 1

### User Activity
- Active Tenants: 156
- New Signups: 23
- Demo Requests: 15

### Agent Performance
- Total Agent Calls: 12,847
- Avg Response Time: 1.2s
- Success Rate: 98.7%

### Top Performing Agents
1. Smokey - 4,521 calls
2. Pops - 3,892 calls
3. Craig - 2,156 calls`,
            };
            canSaveAsPlaybook = true;

        } else {
            plan = ['Parse Request', 'Execute Command', 'Return Results'];
            steps = [
                { id: 't1', toolName: 'planner', description: 'Analyzing request...', status: 'completed', durationMs: 300 },
                { id: 't2', toolName: 'execute', description: 'Processing...', status: 'completed', durationMs: 500 },
            ];
            responseText = "I've processed your request. What else can I help you with?";
        }

        const initialAgentMsg: ChatMessage = {
            id: agentMsgId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: { isThinking: true, steps: [], plan: plan }
        };
        setMessages(prev => [...prev, initialAgentMsg]);

        for (let i = 0; i < steps.length; i++) {
            await new Promise(r => setTimeout(r, 600 + Math.random() * 300));
            const currentSteps = steps.slice(0, i + 1);
            setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, thinking: { ...m.thinking!, steps: currentSteps } } : m));
        }

        await new Promise(r => setTimeout(r, 400));
        setMessages(prev => prev.map(m => m.id === agentMsgId ? {
            ...m,
            content: responseText,
            thinking: { ...m.thinking!, isThinking: false },
            artifact,
            canSaveAsPlaybook
        } : m));
        setIsSimulating(false);
    };

    const handleSavePlaybook = (msgId: string) => {
        console.log('Saving playbook for message:', msgId);
    };

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsSimulating(true);
        await runSimulation(input);
    };

    const hasMessages = messages.length > 0;

    return (
        <>
            <Card className={cn("flex flex-col shadow-sm border-muted transition-all duration-300", hasMessages ? "h-[500px]" : "h-auto")}>
                <div className="p-4 bg-background border-b">
                    <div className="max-w-3xl mx-auto bg-muted/20 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all p-3 space-y-3 shadow-inner">
                        <Textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="I'm ready to handle complex workflows. Try: 'Send welcome emails to new signups' or 'Research AIQ competitor pricing'"
                            className="min-h-[60px] border-0 bg-transparent resize-none p-0 focus-visible:ring-0 shadow-none text-base"
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ModelSelector value={model} onChange={setModel} />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <div className="h-4 w-px bg-border/50 mx-1" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowTriggers(true)}
                                >
                                    <CalendarClock className="h-3 w-3" />
                                    <span>Triggers</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowVault(true)}
                                >
                                    <Key className="h-3 w-3" />
                                    <span>Vault</span>
                                </Button>
                            </div>
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
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-muted-foreground">AI can make mistakes. Verify critical automations.</p>
                    </div>
                </div>

                {hasMessages && (
                    <ScrollArea className="flex-1 p-4 bg-slate-50/50">
                        <div className="space-y-6 max-w-3xl mx-auto">
                            {messages.map((msg) => (
                                <div key={msg.id} className={cn("flex flex-col gap-2", msg.type === 'user' ? "items-end" : "items-start")}>
                                    {msg.content && (
                                        <div className={cn("px-4 py-3 rounded-2xl max-w-xl text-sm leading-relaxed shadow-sm", msg.type === 'user' ? "bg-primary text-primary-foreground rounded-br-none" : "bg-white border border-border/50 text-foreground rounded-tl-none")}>
                                            <div className="whitespace-pre-wrap">{msg.content}</div>

                                            {msg.artifact && msg.artifact.type === 'yaml' && (
                                                <YamlArtifact artifact={msg.artifact} />
                                            )}
                                            {msg.artifact && msg.artifact.type === 'report' && (
                                                <ReportArtifact artifact={msg.artifact} />
                                            )}
                                            {msg.artifact && msg.artifact.type === 'email' && (
                                                <EmailArtifact artifact={msg.artifact} />
                                            )}

                                            {msg.canSaveAsPlaybook && !msg.thinking?.isThinking && (
                                                <div className="mt-3 pt-3 border-t border-border/30">
                                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleSavePlaybook(msg.id)}>
                                                        <Save className="h-3.5 w-3.5" />
                                                        Save as Playbook
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {msg.type === 'agent' && msg.thinking && (
                                        <div className="w-full max-w-xl">
                                            <ThinkingBlock thinking={msg.thinking} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </Card>

            <TriggersModal open={showTriggers} onClose={() => setShowTriggers(false)} />
            <VaultModal open={showVault} onClose={() => setShowVault(false)} />
        </>
    );
}
