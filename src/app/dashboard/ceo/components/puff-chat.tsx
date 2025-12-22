'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
    ArrowLeft,
    Upload,
    ChevronDown,
    ChevronUp,
    Check,
    CheckCircle2,
    Loader2,
    Mail,
    FolderOpen,
    Calendar,
    Globe,
    Sparkles,
    Brain,
    Zap,
    Rocket,
    Wrench,
    Settings,
    Briefcase,
    ShoppingCart,
    Search,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { runAgentChat } from '../agents/actions';
import { AgentPersona } from '../agents/personas';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useUser } from '@/firebase/auth/use-user';

// ============ Types ============

export interface ToolCallStep {
    id: string;
    toolName: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    durationMs?: number;
    subagentId?: string;
    isComputerUse?: boolean;
}

export interface ToolPermission {
    id: string;
    name: string;
    icon: 'mail' | 'drive' | 'calendar' | 'web';
    email?: string;
    description: string;
    status: 'pending' | 'granted' | 'denied';
    tools: string[];
}

export interface PuffTrigger {
    id: string;
    type: 'schedule' | 'webhook' | 'event';
    label: string;
    config?: Record<string, any>;
}

export interface PuffMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isThinking?: boolean;
    workDuration?: number; // seconds
    steps?: ToolCallStep[];
    metadata?: {
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context';
        data?: any;
        brandId?: string;
        brandName?: string;
        agentName?: string;
        role?: string;
    };
}

export interface PuffState {
    title: string;
    isConnected: boolean;
    permissions: ToolPermission[];
    triggers: PuffTrigger[];
    // Messages are now in global store
}

// ThinkingLevel type for intelligence selector
export type ThinkingLevel = 'standard' | 'advanced' | 'expert' | 'genius';

// Tool Selection Types
export type ToolMode = 'auto' | 'manual';
export type AvailableTool = 'gmail' | 'calendar' | 'drive' | 'search';

// ============ Sub-components ============

function ModelSelector({ value, onChange }: { value: ThinkingLevel, onChange: (v: ThinkingLevel) => void }) {
    const options: Record<ThinkingLevel, { label: string, desc: string, icon: any }> = {
        standard: { label: 'Standard', desc: 'Fast & cost-effective', icon: Sparkles },
        advanced: { label: 'Advanced', desc: 'Complex logic', icon: Brain },
        expert: { label: 'Expert', desc: 'Deep reasoning', icon: Zap },
        genius: { label: 'Genius', desc: 'Maximum intelligence', icon: Rocket },
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
            <DropdownMenuContent align="start" className="w-[280px]">
                <DropdownMenuLabel>Intelligence Level</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(options) as [ThinkingLevel, typeof options['standard']][]).map(([key, opt]) => (
                    <DropdownMenuItem key={key} onClick={() => onChange(key)} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                            <opt.icon className="h-4 w-4 text-primary" />
                            <span className="font-medium flex-1">{opt.label}</span>
                            {value === key && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function PersonaSelector({ value, onChange }: { value: AgentPersona, onChange: (v: AgentPersona) => void }) {
    const options: Record<AgentPersona, { label: string, desc: string, icon: any }> = {
        puff: { label: 'Puff', desc: 'General Assistant', icon: Sparkles },
        wholesale_analyst: { label: 'Wholesale', desc: 'LeafLink & Inventory', icon: Briefcase },
        menu_watchdog: { label: 'Watchdog', desc: 'Menu Monitoring', icon: ShoppingCart },
        sales_scout: { label: 'Scout', desc: 'Lead Generation', icon: Search },
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
            <DropdownMenuContent align="start" className="w-[280px]">
                <DropdownMenuLabel>Agent Persona</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.entries(options) as [AgentPersona, typeof options['puff']][]).map(([key, opt]) => (
                    <DropdownMenuItem key={key} onClick={() => onChange(key)} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                            <opt.icon className="h-4 w-4 text-primary" />
                            <span className="font-medium flex-1">{opt.label}</span>
                            {value === key && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ToolSelector({
    mode,
    selectedTools,
    onModeChange,
    onToggleTool
}: {
    mode: ToolMode;
    selectedTools: AvailableTool[];
    onModeChange: (mode: ToolMode) => void;
    onToggleTool: (tool: AvailableTool) => void;
}) {
    const tools: { id: AvailableTool; label: string; icon: any }[] = [
        { id: 'gmail', label: 'Gmail', icon: Mail },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'drive', label: 'Drive', icon: FolderOpen },
        { id: 'search', label: 'Web Search', icon: Globe },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-medium border border-transparent hover:border-border hover:bg-background">
                    <Wrench className="h-3 w-3 text-primary" />
                    {mode === 'auto' ? 'Auto Tools' : `${selectedTools.length} Tools`}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px]">
                <DropdownMenuLabel>Tool Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onModeChange(mode === 'auto' ? 'manual' : 'auto')}>
                    <div className="flex items-center justify-between w-full">
                        <span className="text-sm">Auto-detect</span>
                        {mode === 'auto' && <Check className="h-4 w-4" />}
                    </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Available Tools
                </DropdownMenuLabel>
                {tools.map(tool => (
                    <DropdownMenuCheckboxItem
                        key={tool.id}
                        checked={selectedTools.includes(tool.id) || mode === 'auto'}
                        disabled={mode === 'auto'}
                        onCheckedChange={() => onToggleTool(tool.id)}
                    >
                        <div className="flex items-center gap-2">
                            <tool.icon className="h-3 w-3" />
                            <span>{tool.label}</span>
                        </div>
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ConnectionIcon({ type }: { type: ToolPermission['icon'] }) {
    switch (type) {
        case 'mail':
            return (
                <div className="h-10 w-10 rounded-lg bg-white shadow-sm border flex items-center justify-center">
                    <Mail className="h-5 w-5 text-red-500" />
                </div>
            );
        case 'drive':
            return (
                <div className="h-10 w-10 rounded-lg bg-white shadow-sm border flex items-center justify-center">
                    <FolderOpen className="h-5 w-5 text-yellow-500" />
                </div>
            );
        case 'calendar':
            return (
                <div className="h-10 w-10 rounded-lg bg-white shadow-sm border flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-500" />
                </div>
            );
        case 'web':
            return (
                <div className="h-10 w-10 rounded-lg bg-white shadow-sm border flex items-center justify-center">
                    <Globe className="h-5 w-5 text-green-500" />
                </div>
            );
    }
}

function PermissionCard({ permission, onGrant }: { permission: ToolPermission; onGrant: () => void }) {
    return (
        <div className="flex items-start gap-3 p-3 border-b last:border-b-0">
            <ConnectionIcon type={permission.icon} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{permission.name}</span>
                    {permission.email && (
                        <span className="text-xs text-muted-foreground">{permission.email}</span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {permission.description}
                </p>
                {permission.tools.length > 0 && (
                    <div className="mt-2">
                        <p className="text-[10px] text-muted-foreground mb-1">Requesting access to tools:</p>
                        <div className="flex flex-wrap gap-1">
                            {permission.tools.map(tool => (
                                <Button
                                    key={tool}
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                >
                                    {tool}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div>
                {permission.status === 'granted' ? (
                    <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                        <Check className="h-3 w-3 mr-1" />
                        Granted
                    </Badge>
                ) : permission.status === 'pending' ? (
                    <Button size="sm" variant="outline" onClick={onGrant} className="text-xs">
                        Grant
                    </Button>
                ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-500 border-red-200">
                        Denied
                    </Badge>
                )}
            </div>
        </div>
    );
}

function TriggerIndicator({ triggers, expanded, onToggle }: { triggers: PuffTrigger[]; expanded: boolean; onToggle: () => void }) {
    if (triggers.length === 0) return null;

    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
        >
            <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">{triggers.length} trigger{triggers.length !== 1 ? 's' : ''}</span>
            </div>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
    );
}

function ThinkingIndicator({ duration }: { duration?: number }) {
    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Thinking... {duration ? `(${duration}s)` : ''}</span>
        </div>
    );
}

// ============ Main Component ============

export interface PuffChatProps {
    initialTitle?: string;
    onBack?: () => void;
    onSubmit?: (message: string) => Promise<void>;
    promptSuggestions?: string[];
}

export function PuffChat({
    initialTitle = 'New Automation',
    onBack,
    onSubmit,
    promptSuggestions = []
}: PuffChatProps) {
    // Global Store State
    const { currentMessages, addMessage, updateMessage, createSession } = useAgentChatStore();
    const { user } = useUser(); // Get authenticated user for dynamic email

    const [state, setState] = useState<PuffState>({
        title: initialTitle,
        isConnected: true,
        permissions: [],
        triggers: [],
    });

    // Sync title with global store active session title in real app, but simplified here.

    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showTriggers, setShowTriggers] = useState(false);
    const [showPermissions, setShowPermissions] = useState(true);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('standard');
    const searchParams = useSearchParams();
    const [persona, setPersona] = useState<AgentPersona>('puff');

    // Tool Selection State
    const [toolMode, setToolMode] = useState<ToolMode>('auto');
    const [selectedTools, setSelectedTools] = useState<AvailableTool[]>([]);

    const handleToggleTool = (tool: AvailableTool) => {
        setSelectedTools(prev =>
            prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
        );
    };

    // Effect to read persona from query parameters
    useEffect(() => {
        const agentParam = searchParams?.get('agent') || searchParams?.get('persona');
        if (agentParam) {
            // Map common agent IDs to their corresponding personas if names differ
            const mapping: Record<string, AgentPersona> = {
                'smokey': 'puff', // Smokey is the general budtender/assistant
                'ezal': 'menu_watchdog',
                'craig': 'sales_scout',
                'pops': 'wholesale_analyst',
                'money-mike': 'wholesale_analyst', // Fallback for now
            };

            const targetPersona = (mapping[agentParam] || agentParam) as AgentPersona;
            if (['puff', 'wholesale_analyst', 'menu_watchdog', 'sales_scout'].includes(targetPersona)) {
                setPersona(targetPersona);
            }
        }
    }, [searchParams]);

    // Effect to scroll to bottom on new messages
    // ... (omitted for brevity, scroll logic is usually handled by ScrollArea or separate ref)

    // Map store messages to PuffMessage structure
    const displayMessages: PuffMessage[] = currentMessages.map(m => ({
        id: m.id,
        role: m.type === 'agent' ? 'assistant' : 'user',
        content: m.content,
        timestamp: new Date(m.timestamp),
        isThinking: m.thinking?.isThinking,
        steps: m.thinking?.steps,
        metadata: m.metadata,
        workDuration: 0 // Not persisted but OK
    }));

    const handleSubmit = useCallback(async () => {
        if (!input.trim() || isProcessing) return;

        const userInput = input;

        const userMsgId = `user-${Date.now()}`;
        addMessage({
            id: userMsgId,
            type: 'user',
            content: userInput,
            timestamp: new Date()
        });

        setInput('');
        setIsProcessing(true);

        const thinkingId = `thinking-${Date.now()}`;
        addMessage({
            id: thinkingId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: { isThinking: true, steps: [], plan: [] }
        });

        const durationInterval = setInterval(() => {
            // duration update logic
        }, 1000);

        try {
            // Call the real AI backend
            const response = await runAgentChat(userInput, persona);

            clearInterval(durationInterval);

            // Determine tools based on mode
            const responseText = response.content.toLowerCase();

            let needsGmail = false;
            let needsSchedule = false;

            if (toolMode === 'auto') {
                needsGmail = responseText.includes('email') || responseText.includes('gmail') || userInput.toLowerCase().includes('email');
                needsSchedule = responseText.includes('daily') || responseText.includes('schedule') || userInput.toLowerCase().includes('daily');
            } else {
                needsGmail = selectedTools.includes('gmail');
                needsSchedule = selectedTools.includes('calendar'); // Assuming schedule maps to calendar
            }

            const newPermissions: ToolPermission[] = [];
            const newTriggers: PuffTrigger[] = [];

            if (needsGmail) {
                newPermissions.push({
                    id: 'gmail',
                    name: 'Gmail',
                    icon: 'mail',
                    email: user?.email || 'unknown@user.com', // Dynamic Email
                    description: 'Integration with Gmail',
                    status: 'granted',
                    tools: ['Send Message'],
                });
            }

            if (needsSchedule) newTriggers.push({ id: 'schedule-1', type: 'schedule', label: 'Daily at 9:00 AM' });

            // Update local state for permissions/triggers (not persisted in store yet, acceptable trade-off)
            setState(prev => ({
                ...prev,
                permissions: [...prev.permissions, ...newPermissions],
                triggers: [...prev.triggers, ...newTriggers],
            }));
            if (newPermissions.length > 0) setShowPermissions(true);

            // Update Global Store with response
            updateMessage(thinkingId, {
                content: response.content,
                metadata: response.metadata, // Store rich metadata
                thinking: {
                    isThinking: false,
                    steps: response.toolCalls?.map(tc => ({
                        id: tc.id,
                        toolName: tc.name, // Mapping 'name' to 'toolName'
                        description: tc.result, // Using result as description or status
                        status: tc.status === 'success' ? 'completed' : tc.status === 'error' ? 'failed' : 'pending',
                        durationMs: 0
                    })) || [],
                    plan: []
                }
            });

        } catch (error) {
            clearInterval(durationInterval);
            console.error(error);
            updateMessage(thinkingId, {
                content: 'I ran into an issue. Please try again.',
                thinking: { isThinking: false, steps: [], plan: [] }
            });
        }

        setIsProcessing(false);

        if (onSubmit) {
            await onSubmit(userInput);
        }
    }, [input, isProcessing, onSubmit, addMessage, updateMessage, persona, toolMode, selectedTools, user]);

    const handleGrantPermission = (permissionId: string) => {
        setState(prev => ({
            ...prev,
            permissions: prev.permissions.map(p =>
                p.id === permissionId ? { ...p, status: 'granted' } : p
            ),
        }));
    };

    const hasMessages = displayMessages.length > 0;

    // Input component (reusable for both positions)
    const InputArea = (
        <div className={cn("p-4", hasMessages ? "border-t" : "border-b")}>
            <div className="max-w-3xl mx-auto bg-muted/20 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all p-3 space-y-3 shadow-inner">
                {promptSuggestions.length > 0 && !hasMessages && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {promptSuggestions.map((suggestion, i) => (
                            <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs bg-background/50 hover:bg-background"
                                onClick={() => setInput(suggestion)}
                            >
                                {suggestion}
                            </Button>
                        ))}
                    </div>
                )}
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={hasMessages ? "Reply to continue..." : "Ask Baked HQ anything..."}
                    className="min-h-[60px] border-0 bg-transparent resize-none p-0 focus-visible:ring-0 shadow-none text-base"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Upload className="h-4 w-4" />
                        </Button>
                        <div className="border-l pl-2 flex items-center gap-1">
                            <PersonaSelector value={persona} onChange={setPersona} />
                            <ModelSelector value={thinkingLevel} onChange={setThinkingLevel} />
                            <ToolSelector
                                mode={toolMode}
                                selectedTools={selectedTools}
                                onModeChange={setToolMode}
                                onToggleTool={handleToggleTool}
                            />
                        </div>
                    </div>
                    <Button
                        size="icon"
                        className={cn("h-8 w-8 rounded-full transition-all", input.trim() ? "bg-primary" : "bg-muted text-muted-foreground")}
                        disabled={!input.trim() || isProcessing}
                        onClick={handleSubmit}
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            {!hasMessages && (
                <div className="text-center mt-2">
                    <p className="text-[10px] text-muted-foreground">AI can make mistakes. Verify critical automations.</p>
                </div>
            )}
            {isProcessing && hasMessages && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '11%' }} />
                    </div>
                    <span>Processing...</span>
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-background border rounded-lg">
            {/* Header - only show if we have messages */}
            {hasMessages && (
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-violet-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        {onBack && (
                            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <h2 className="font-semibold">{state.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {state.isConnected && (
                            <Badge variant="outline" className="bg-white">
                                <span className="text-xs">Connected</span>
                                <span className="ml-1">🎨🌿</span>
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* Input at TOP when no messages */}
            {!hasMessages && InputArea}

            {/* Content Area - only show if we have messages */}
            {hasMessages && (
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">

                        {/* Messages */}
                        {displayMessages.map(message => (
                            <div key={message.id}>
                                {message.role === 'user' ? (
                                    <div className="flex justify-end">
                                        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {message.steps && message.steps.length > 0 && (
                                            <StepsList steps={message.steps} />
                                        )}
                                        {message.isThinking ? (
                                            <ThinkingIndicator duration={message.workDuration} />
                                        ) : (
                                            <>
                                                {/* Rich Metadata Rendering */}
                                                {message.metadata?.type === 'compliance_report' && (
                                                    <Card className="border-red-200 bg-red-50 mb-2">
                                                        <CardContent className="p-3">
                                                            <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                                                                <ShieldCheck className="h-4 w-4" />
                                                                <span>Compliance Violation Detected</span>
                                                            </div>
                                                            <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
                                                                {message.metadata.data.violations.map((v: string, i: number) => (
                                                                    <li key={i}>{v}</li>
                                                                ))}
                                                            </ul>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {message.metadata?.type === 'product_rec' && (
                                                    <Card className="border-emerald-200 bg-emerald-50 mb-2">
                                                        <CardContent className="p-3">
                                                            <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2">
                                                                <ShoppingCart className="h-4 w-4" />
                                                                <span>Smokey's Picks</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {message.metadata.data.products.map((p: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-emerald-100">
                                                                        <div>
                                                                            <p className="text-sm font-medium">{p.name}</p>
                                                                            <p className="text-[10px] text-muted-foreground">{p.reason}</p>
                                                                        </div>
                                                                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                                                                            {Math.round(p.score * 100)}% Match
                                                                        </Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                <div className="prose prose-sm max-w-none">
                                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Permissions Panel */}
                        {state.permissions.length > 0 && showPermissions && (
                            <Card className="mt-4">
                                <CardContent className="p-0">
                                    <div className="p-3 border-b">
                                        <h3 className="font-medium text-sm">Grant permissions to agent?</h3>
                                        <p className="text-xs text-muted-foreground">
                                            The agent wants the ability to use tools from your connections
                                        </p>
                                    </div>
                                    {state.permissions.map(permission => (
                                        <PermissionCard
                                            key={permission.id}
                                            permission={permission}
                                            onGrant={() => handleGrantPermission(permission.id)}
                                        />
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Triggers */}
                        {state.triggers.length > 0 && (
                            <TriggerIndicator
                                triggers={state.triggers}
                                expanded={showTriggers}
                                onToggle={() => setShowTriggers(!showTriggers)}
                            />
                        )}
                    </div>
                </ScrollArea>
            )}

            {/* Input at BOTTOM when we have messages */}
            {hasMessages && InputArea}
        </div>
    );
}
