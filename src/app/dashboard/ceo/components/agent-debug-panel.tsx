'use client';

/**
 * Agent Debug Panel
 *
 * A test/debug mode component that shows agent reasoning, tool calls,
 * and internal state during conversations. Helps understand how agents
 * process requests and make decisions.
 *
 * Only visible to Super Users when debug mode is enabled.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Bug,
    ChevronDown,
    ChevronRight,
    Clock,
    Cpu,
    FileJson,
    GitBranch,
    Lightbulb,
    MessageSquare,
    Network,
    Play,
    RotateCcw,
    Settings,
    Sparkles,
    Terminal,
    Wrench,
    Zap,
    Copy,
    Check,
    AlertTriangle,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { THREAD_AGENT_MAPPING, InboxThreadType, getThreadTypeLabel } from '@/types/inbox';
import { PERSONAS, AgentPersona } from '../agents/personas';

// ============ Types ============

interface ToolCall {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    input?: Record<string, unknown>;
    output?: unknown;
    durationMs?: number;
    error?: string;
}

interface ThinkingStep {
    id: string;
    type: 'planning' | 'reasoning' | 'tool_selection' | 'response_generation';
    content: string;
    timestamp: Date;
}

interface AgentDebugState {
    isEnabled: boolean;
    currentAgent: AgentPersona | null;
    threadType: InboxThreadType | null;
    thinking: ThinkingStep[];
    toolCalls: ToolCall[];
    routingDecision: {
        requestedAgent: string;
        actualAgent: string;
        reason: string;
        supportingAgents: string[];
    } | null;
    modelInfo: {
        model: string;
        tokensUsed: number;
        latencyMs: number;
    } | null;
    rawPrompt: string | null;
    rawResponse: string | null;
}

interface AgentDebugPanelProps {
    isVisible: boolean;
    onToggle: () => void;
    currentAgent?: AgentPersona;
    threadType?: InboxThreadType;
    onReplayPrompt?: (prompt: string) => void;
}

// ============ Sub-components ============

function DebugSection({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
    badge,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50 rounded-md transition-colors">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{title}</span>
                    {badge && (
                        <Badge variant="secondary" className="text-xs">
                            {badge}
                        </Badge>
                    )}
                </div>
                {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0">
            {copied ? (
                <Check className="h-3 w-3 text-green-500" />
            ) : (
                <Copy className="h-3 w-3" />
            )}
        </Button>
    );
}

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const statusIcon = {
        pending: <Clock className="h-3 w-3 text-yellow-500" />,
        running: <Zap className="h-3 w-3 text-blue-500 animate-pulse" />,
        completed: <CheckCircle2 className="h-3 w-3 text-green-500" />,
        failed: <XCircle className="h-3 w-3 text-red-500" />,
    }[toolCall.status];

    return (
        <div className="border rounded-md p-2 text-xs">
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {statusIcon}
                    <span className="font-mono">{toolCall.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    {toolCall.durationMs && (
                        <span className="text-muted-foreground">{toolCall.durationMs}ms</span>
                    )}
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
            </div>
            {isExpanded && (
                <div className="mt-2 space-y-2">
                    {toolCall.input && (
                        <div>
                            <span className="text-muted-foreground">Input:</span>
                            <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(toolCall.input, null, 2)}
                            </pre>
                        </div>
                    )}
                    {toolCall.output !== undefined && toolCall.output !== null && (
                        <div>
                            <span className="text-muted-foreground">Output:</span>
                            <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto max-h-32">
                                {typeof toolCall.output === 'string'
                                    ? toolCall.output.substring(0, 500)
                                    : JSON.stringify(toolCall.output, null, 2).substring(0, 500)}
                            </pre>
                        </div>
                    )}
                    {toolCall.error && (
                        <div className="text-red-500">
                            <span>Error:</span> {toolCall.error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ThinkingStepItem({ step }: { step: ThinkingStep }) {
    const typeConfig = {
        planning: { icon: GitBranch, color: 'text-blue-500', label: 'Planning' },
        reasoning: { icon: Lightbulb, color: 'text-yellow-500', label: 'Reasoning' },
        tool_selection: { icon: Wrench, color: 'text-purple-500', label: 'Tool Selection' },
        response_generation: { icon: MessageSquare, color: 'text-green-500', label: 'Generating' },
    }[step.type];

    const Icon = typeConfig.icon;

    return (
        <div className="flex gap-2 text-xs">
            <div className={cn('mt-0.5', typeConfig.color)}>
                <Icon className="h-3 w-3" />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className={cn('font-medium', typeConfig.color)}>{typeConfig.label}</span>
                    <span className="text-muted-foreground text-[10px]">
                        {step.timestamp.toLocaleTimeString()}
                    </span>
                </div>
                <p className="text-muted-foreground mt-0.5">{step.content}</p>
            </div>
        </div>
    );
}

// ============ Main Component ============

export function AgentDebugPanel({
    isVisible,
    onToggle,
    currentAgent,
    threadType,
    onReplayPrompt,
}: AgentDebugPanelProps) {
    const [debugState, setDebugState] = useState<AgentDebugState>({
        isEnabled: true,
        currentAgent: currentAgent || null,
        threadType: threadType || null,
        thinking: [],
        toolCalls: [],
        routingDecision: null,
        modelInfo: null,
        rawPrompt: null,
        rawResponse: null,
    });

    // Update when props change
    useEffect(() => {
        if (currentAgent) {
            const routing = threadType ? THREAD_AGENT_MAPPING[threadType] : null;
            setDebugState(prev => ({
                ...prev,
                currentAgent,
                threadType: threadType || null,
                routingDecision: routing ? {
                    requestedAgent: currentAgent,
                    actualAgent: routing.primary,
                    reason: currentAgent === routing.primary ? 'Direct match' : 'Agent override',
                    supportingAgents: routing.supporting,
                } : null,
            }));
        }
    }, [currentAgent, threadType]);

    // Mock thinking steps for demo (in production, this would come from the agent runner)
    useEffect(() => {
        if (currentAgent && debugState.thinking.length === 0) {
            const persona = PERSONAS[currentAgent];
            setDebugState(prev => ({
                ...prev,
                thinking: [
                    {
                        id: '1',
                        type: 'planning',
                        content: `Activated ${persona?.name || currentAgent} persona`,
                        timestamp: new Date(),
                    },
                    {
                        id: '2',
                        type: 'reasoning',
                        content: `Analyzing request context and user intent...`,
                        timestamp: new Date(),
                    },
                ],
            }));
        }
    }, [currentAgent]);

    if (!isVisible) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className="fixed bottom-4 right-4 z-50 gap-2"
            >
                <Bug className="h-4 w-4" />
                Debug
            </Button>
        );
    }

    const persona = currentAgent ? PERSONAS[currentAgent] : null;

    return (
        <Card className="fixed bottom-4 right-4 w-96 max-h-[70vh] z-50 shadow-xl border-2 border-dashed border-yellow-500/50 bg-background/95 backdrop-blur">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Bug className="h-4 w-4 text-yellow-500" />
                        Agent Debug Mode
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <RotateCcw className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onToggle} className="h-6 w-6 p-0">
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                {currentAgent && (
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                            {persona?.name || currentAgent}
                        </Badge>
                        {threadType && (
                            <Badge variant="secondary" className="text-xs">
                                {getThreadTypeLabel(threadType)}
                            </Badge>
                        )}
                    </div>
                )}
            </CardHeader>

            <ScrollArea className="h-[calc(70vh-100px)]">
                <CardContent className="space-y-2 pb-4">
                    {/* Agent Routing */}
                    <DebugSection title="Agent Routing" icon={Network} badge={debugState.routingDecision ? 'Active' : undefined}>
                        {debugState.routingDecision ? (
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Primary Agent:</span>
                                    <span className="font-mono">{debugState.routingDecision.actualAgent}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Agent:</span>
                                    <span className="font-mono">{debugState.routingDecision.requestedAgent}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Supporting:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {debugState.routingDecision.supportingAgents.map(agent => (
                                            <Badge key={agent} variant="outline" className="text-[10px]">
                                                {agent}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No routing decision yet</p>
                        )}
                    </DebugSection>

                    {/* Thinking Process */}
                    <DebugSection
                        title="Thinking Process"
                        icon={Lightbulb}
                        badge={debugState.thinking.length > 0 ? `${debugState.thinking.length} steps` : undefined}
                    >
                        {debugState.thinking.length > 0 ? (
                            <div className="space-y-3">
                                {debugState.thinking.map(step => (
                                    <ThinkingStepItem key={step.id} step={step} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No thinking steps recorded</p>
                        )}
                    </DebugSection>

                    {/* Tool Calls */}
                    <DebugSection
                        title="Tool Calls"
                        icon={Wrench}
                        badge={debugState.toolCalls.length > 0 ? `${debugState.toolCalls.length}` : undefined}
                        defaultOpen={false}
                    >
                        {debugState.toolCalls.length > 0 ? (
                            <div className="space-y-2">
                                {debugState.toolCalls.map(tc => (
                                    <ToolCallItem key={tc.id} toolCall={tc} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No tool calls yet</p>
                        )}
                    </DebugSection>

                    {/* Model Info */}
                    <DebugSection title="Model Info" icon={Cpu} defaultOpen={false}>
                        {debugState.modelInfo ? (
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Model:</span>
                                    <span className="font-mono">{debugState.modelInfo.model}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tokens:</span>
                                    <span>{debugState.modelInfo.tokensUsed}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Latency:</span>
                                    <span>{debugState.modelInfo.latencyMs}ms</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex justify-between">
                                    <span>Model:</span>
                                    <span className="font-mono">claude-3-5-sonnet / gemini-2.0-flash</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Thinking:</span>
                                    <span>Claude 4.5 Opus (Executives)</span>
                                </div>
                            </div>
                        )}
                    </DebugSection>

                    {/* System Prompt Preview */}
                    <DebugSection title="System Prompt" icon={Terminal} defaultOpen={false}>
                        {persona ? (
                            <div className="relative">
                                <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto max-h-32 whitespace-pre-wrap">
                                    {persona.systemPrompt.substring(0, 500)}...
                                </pre>
                                <div className="absolute top-1 right-1">
                                    <CopyButton text={persona.systemPrompt} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">Select an agent to view prompt</p>
                        )}
                    </DebugSection>

                    {/* Quick Actions */}
                    <div className="pt-2 border-t">
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 text-xs">
                                <Play className="h-3 w-3 mr-1" />
                                Replay
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1 text-xs">
                                <FileJson className="h-3 w-3 mr-1" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </ScrollArea>
        </Card>
    );
}

// ============ Hook for Debug State ============

export function useAgentDebug() {
    const [isDebugVisible, setIsDebugVisible] = useState(false);
    const [debugAgent, setDebugAgent] = useState<AgentPersona | undefined>();
    const [debugThreadType, setDebugThreadType] = useState<InboxThreadType | undefined>();

    const toggleDebug = () => setIsDebugVisible(prev => !prev);

    const setDebugContext = (agent: AgentPersona, threadType?: InboxThreadType) => {
        setDebugAgent(agent);
        setDebugThreadType(threadType);
    };

    return {
        isDebugVisible,
        toggleDebug,
        debugAgent,
        debugThreadType,
        setDebugContext,
    };
}
