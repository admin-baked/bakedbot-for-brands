'use client';

import { useState, useCallback, useEffect } from 'react';
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

    Briefcase,
    ShoppingCart,
    Search,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { runAgentChat } from '../../ceo/agents/actions';
import { AgentPersona } from '../../ceo/agents/personas';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useUserRole } from '@/hooks/use-user-role';

// ============ Types ============

export type { ChatMessage } from '@/lib/store/agent-chat-store';

export interface ToolCallStep {
    id: string;
    toolName: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    durationMs?: number;
    subagentId?: string;
    isComputerUse?: boolean;
}

export interface ChatArtifact {
    id: string;
    type: 'code' | 'image' | 'file' | 'yaml' | 'json';
    title: string;
    content: string;
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

export interface TaskletTrigger {
    id: string;
    type: 'schedule' | 'webhook' | 'event';
    label: string;
    config?: Record<string, any>;
}


export interface TaskletMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isThinking?: boolean;
    workDuration?: number; // seconds
    steps?: ToolCallStep[];
    metadata?: {
        type: 'compliance_report' | 'product_rec' | 'elasticity_analysis';
        data: any;
    };
}

export interface TaskletState {
    title: string;
    isConnected: boolean;
    permissions: ToolPermission[];
    triggers: TaskletTrigger[];
    // Messages are now in global store
}

// ThinkingLevel type for intelligence selector
export type ThinkingLevel = 'standard' | 'advanced' | 'expert' | 'genius';

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
        tasklet: { label: 'Tasklet', desc: 'General Assistant', icon: Sparkles },
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
                {(Object.entries(options) as [AgentPersona, typeof options['tasklet']][]).map(([key, opt]) => (
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

function TriggerIndicator({ triggers, expanded, onToggle }: { triggers: TaskletTrigger[]; expanded: boolean; onToggle: () => void }) {
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

function StepsList({ steps }: { steps: ToolCallStep[] }) {
    if (!steps || steps.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-3 bg-muted/30 p-2 rounded-lg text-xs">
            <div className="font-semibold text-muted-foreground flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span>Thought Process</span>
            </div>
            {steps.map(step => (
                <div key={step.id} className="flex items-center gap-2">
                    {step.status === 'completed' ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : step.status === 'failed' ? (
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    )}
                    <span className="font-medium">{step.toolName}</span>
                    <span className="text-muted-foreground truncate max-w-[200px]">- {step.description}</span>
                </div>
            ))}
        </div>
    );
}

// ============ Main Component ============

export interface AgentChatProps {
    initialTitle?: string;
    onBack?: () => void;
    onSubmit?: (message: string) => Promise<void>;
    // Keep standard props for compatibility if needed, but unused here
    mode?: any;
    placeholder?: string;
    defaultThinkingLevel?: any;
    externalInput?: string;
    onSimulate?: any;
    onSavePlaybook?: any;
}

export function AgentChat({
    initialTitle = 'New Automation',
    onBack,
    onSubmit
}: AgentChatProps) {
    // Global Store State
    const { currentMessages, addMessage, updateMessage, setCurrentRole } = useAgentChatStore();
    const { role } = useUserRole();

    // Ensure store knows current role
    useEffect(() => {
        if (role) setCurrentRole(role);
    }, [role, setCurrentRole]);

    const [state, setState] = useState<TaskletState>({
        title: initialTitle,
        isConnected: true,
        permissions: [],
        triggers: [],
    });

    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showTriggers, setShowTriggers] = useState(false);
    const [showPermissions, setShowPermissions] = useState(true);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('standard');
    const [persona, setPersona] = useState<AgentPersona>('tasklet');

    // Map store messages to TaskletMessage structure
    const displayMessages: TaskletMessage[] = currentMessages.map(m => ({
        id: m.id,
        role: m.type === 'agent' ? 'assistant' : 'user',
        content: m.content,
        timestamp: new Date(m.timestamp),
        isThinking: m.thinking?.isThinking,
        steps: m.thinking?.steps,
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

            // Check if response mentions integrations
            const responseText = response.content.toLowerCase();
            const needsGmail = responseText.includes('email') || responseText.includes('gmail') || userInput.toLowerCase().includes('email');
            const needsSchedule = responseText.includes('daily') || responseText.includes('schedule') || userInput.toLowerCase().includes('daily');

            const newPermissions: ToolPermission[] = [];
            const newTriggers: TaskletTrigger[] = [];

            if (needsGmail) {
                newPermissions.push({
                    id: 'gmail',
                    name: 'Gmail',
                    icon: 'mail',
                    email: 'martez@bakedbot.ai',
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
    }, [input, isProcessing, onSubmit, addMessage, updateMessage, persona]);

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
