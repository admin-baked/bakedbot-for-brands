'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeBlock } from '@/components/ui/code-block';
import { AudioRecorder } from '@/components/ui/audio-recorder';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { ThinkingWindow } from '@/components/chat/thinking-window';
import { DiscoveryBar, DiscoverySummary, type DiscoveryStep } from '@/components/chat/discovery-bar';
import { ArtifactPanel } from '@/components/artifacts/artifact-panel';
import { parseArtifactsFromContent, Artifact } from '@/types/artifact';
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
    ShieldCheck,
    AlertCircle,
    Copy,
    CheckCircle,
    Paperclip,
    X,
    FileText,
    Image as ImageIcon,
    Leaf,
    Megaphone,
    BarChart3,
    DollarSign,
    Heart,
    ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { runAgentChat, cancelAgentJob, getGoogleAuthUrl } from '../agents/actions';
import { saveChatSession, getChatSessions } from '@/server/actions/chat-persistence'; // Import server actions
import { saveArtifact } from '@/server/actions/artifacts';
import { AgentPersona } from '../agents/personas';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useUser } from '@/firebase/auth/use-user';
import { ModelSelector, ThinkingLevel } from './model-selector';
import { ChatMediaPreview, extractMediaFromToolResponse } from '@/components/chat/chat-media-preview';
import { useJobPoller } from '@/hooks/use-job-poller';
import { TypewriterText } from '@/components/landing/typewriter-text';
import { AgentRouterVisualization } from '@/components/chat/agent-router-visualization';
import { ProjectSelector } from '@/components/chat/project-selector';
import { HireAgentModal } from '@/components/billing/hire-agent-modal';
import { AgentResponseCarousel } from '@/components/chat/agent-response-carousel';
import { useIsMobile } from '@/hooks/use-mobile';

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
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context' | 'hire_modal';
        data?: any;
        brandId?: string;
        brandName?: string;
        agentName?: string;
        role?: string;
        media?: {
            type: 'image' | 'video';
            url: string;
            prompt?: string;
            duration?: number;
            model?: string;
        } | null;
    };
}

export interface PuffState {
    title: string;
    isConnected: boolean;
    permissions: ToolPermission[];
    triggers: PuffTrigger[];
    // Messages are now in global store
}

// ThinkingLevel type for intelligence selector (Removed - using import)

// Tool Selection Types
export type ToolMode = 'auto' | 'manual';
export type AvailableTool = 'gmail' | 'calendar' | 'drive' | 'search';

// ============ Sub-components ============

// ModelSelector is imported

const PRESET_RESPONSES: Record<string, { content: string, steps?: { toolName: string, description: string }[] }> = {
    // All presets disabled to force Agentic Flow
};


function PersonaSelector({ value, onChange, isSuperUser = false, isAuthenticated = true }: { value: AgentPersona, onChange: (v: AgentPersona) => void, isSuperUser?: boolean, isAuthenticated?: boolean }) {
    // Core agents visible to all
    const coreAgents: Record<string, { label: string, desc: string, icon: any }> = {
        puff: { label: 'Puff', desc: 'General Assistant', icon: Sparkles },
        smokey: { label: 'Smokey', desc: 'Digital Budtender', icon: Leaf },
        craig: { label: 'Craig', desc: 'Marketing Automation', icon: Megaphone },
        pops: { label: 'Pops', desc: 'Analytics & Insights', icon: BarChart3 },
        ezal: { label: 'Ezal', desc: 'Market Scout', icon: Zap },
        money_mike: { label: 'Money Mike', desc: 'Pricing Strategy', icon: DollarSign },
        mrs_parker: { label: 'Mrs. Parker', desc: 'Loyalty & VIPs', icon: Heart },
        deebo: { label: 'Deebo', desc: 'Compliance Guard', icon: ShieldAlert },
    };
    // Executive Suite - Super Users only
    const executiveAgents: Record<string, { label: string, desc: string, icon: any }> = {
        leo: { label: 'Leo', desc: 'COO & Orchestrator', icon: Briefcase },
        jack: { label: 'Jack', desc: 'CRO & Revenue', icon: Rocket },
        linus: { label: 'Linus', desc: 'CTO & Technology', icon: Wrench },
        glenda: { label: 'Glenda', desc: 'CMO & Marketing', icon: Sparkles },
        mike_exec: { label: 'Mike', desc: 'CFO & Finance', icon: DollarSign },
    };
    const options = isSuperUser ? { ...coreAgents, ...executiveAgents } : coreAgents;
    const currentOpt = (options as any)[value] || coreAgents.puff;
    const SelectedIcon = currentOpt.icon;
    
    // Determine if "Interviewing"
    const isInterviewing = !isAuthenticated && value !== 'puff';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-medium border border-transparent hover:border-border hover:bg-background">
                    <SelectedIcon className="h-3 w-3 text-primary" />
                    {currentOpt.label}
                    {isInterviewing && <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Interviewing</Badge>}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[280px]">
                <DropdownMenuLabel>Digital Workers</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(coreAgents).map(([key, opt]) => (
                    <DropdownMenuItem key={key} onClick={() => onChange(key as AgentPersona)} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                        <div className="flex items-center gap-2 w-full">
                            <opt.icon className="h-4 w-4 text-primary" />
                            <span className="font-medium flex-1">
                                {opt.label}
                                {!isAuthenticated && key !== 'puff' && <span className="ml-2 text-[10px] text-yellow-600 font-normal bg-yellow-50 px-1 rounded">(Interviewing)</span>}
                            </span>
                            {value === key && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                    </DropdownMenuItem>
                ))}
                {isSuperUser && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Executive Boardroom</DropdownMenuLabel>
                        {Object.entries(executiveAgents).map(([key, opt]) => (
                            <DropdownMenuItem key={key} onClick={() => onChange(key as AgentPersona)} className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                                <div className="flex items-center gap-2 w-full">
                                    <opt.icon className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium flex-1">{opt.label}</span>
                                    {value === key && <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />}
                                </div>
                                <span className="text-xs text-muted-foreground ml-6">{opt.desc}</span>
                            </DropdownMenuItem>
                        ))}
                    </>
                )}
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




// ============ Main Component ============

export interface PuffChatProps {
    initialTitle?: string;
    onBack?: () => void;
    onSubmit?: (message: string) => Promise<void>;
    promptSuggestions?: string[];
    hideHeader?: boolean;
    className?: string;
    isAuthenticated?: boolean; // For public demos
    isSuperUser?: boolean; // Super User unlock
    isHired?: boolean; // If true, hides hire buttons/modals
    persona?: AgentPersona; // External persona override
    locationInfo?: {
        dispensaryCount: number;
        brandCount: number;
        city: string;
    } | null;
    initialPermissions?: any[];
}

export function PuffChat({
    initialTitle = 'New Automation',
    onBack,
    onSubmit,
    promptSuggestions = [],
    hideHeader = false,
    className = '',
    isAuthenticated = true, // Default to true for backward compatibility
    isSuperUser = false,
    isHired = false, // New prop to suppress hiring flows
    persona: externalPersona,
    locationInfo,
    initialPermissions
}: PuffChatProps) {
    // Global Store State
    const { 
        currentMessages, addMessage, updateMessage, createSession,
        currentArtifacts, activeArtifactId, isArtifactPanelOpen,
        addArtifact, setActiveArtifact, setArtifactPanelOpen 
    } = useAgentChatStore();
    const { user } = useUser(); // Get authenticated user for dynamic email
    const isMobile = useIsMobile(); // Detect mobile for responsive typewriter behavior

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
    const [persona, setPersona] = useState<AgentPersona>(externalPersona || 'puff');

    // Sync external persona if provided
    useEffect(() => {
        if (externalPersona) {
            setPersona(externalPersona);
        }
    }, [externalPersona]);

    // Sync initialPermissions if provided
    useEffect(() => {
        if (initialPermissions?.length) {
            setState(prev => ({
                ...prev,
                permissions: initialPermissions
            }));
        }
    }, [initialPermissions]);

    // Tool Selection State
    const [toolMode, setToolMode] = useState<ToolMode>('auto');
    const [selectedTools, setSelectedTools] = useState<AvailableTool[]>([]);
    
    // Hiring State
    const [isHireModalOpen, setIsHireModalOpen] = useState(false);
    const [selectedHirePlan, setSelectedHirePlan] = useState<'specialist' | 'empire'>('specialist');

    const openHireModal = (plan: 'specialist' | 'empire') => {
        setSelectedHirePlan(plan);
        setIsHireModalOpen(true);
    };
    
    // Project Context State
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Multi-modal State
    const [attachments, setAttachments] = useState<{ id: string, file: File, preview?: string, type: 'image' | 'file' }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);


    // Async Job Polling
    const [activeJob, setActiveJob] = useState<{ jobId: string, messageId: string } | null>(null);
    // Unified Discovery Bar State
    const [discoverySteps, setDiscoverySteps] = useState<DiscoveryStep[]>([]);
    const [isDiscoveryActive, setIsDiscoveryActive] = useState(false);
    const [isFirstDiscovery, setIsFirstDiscovery] = useState(true);
    const [showDiscoveryBar, setShowDiscoveryBar] = useState(false);
    // Typewriter Streaming
    const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
    // Scrolling Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const { job, thoughts, isComplete, error: jobError } = useJobPoller(activeJob?.jobId);

    // Sync Async Job to UI Store
    useEffect(() => {
        if (!activeJob) return;

        // 1. Update Thinking Steps from Thoughts - sync to unified discovery bar
        if (thoughts.length > 0) {
            // Sync to discovery bar
            const newSteps: DiscoveryStep[] = thoughts.map(t => ({
                id: t.id,
                agentId: t.agentId || 'puff',
                agentName: t.agentName || 'Puff',
                action: t.title,
                status: isComplete ? 'done' : 'running',
                startedAt: t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp as any),
                durationMs: t.durationMs || 0
            }));
            setDiscoverySteps(newSteps);
            setIsDiscoveryActive(!isComplete);
            setShowDiscoveryBar(true);
            
            // Also update message for persistence (but not for live display)
            updateMessage(activeJob.messageId, {
                thinking: {
                    isThinking: !isComplete,
                    steps: thoughts.map(t => ({
                        id: t.id,
                        toolName: t.title,
                        description: t.detail || '',
                        status: 'completed',
                        durationMs: 0
                    })),
                    plan: []
                }
            });
        }

        // 2. Handle Completion
        if (isComplete && job?.result) {
            const result = job.result; // AgentResult object
            let finalContent = (typeof result.content === 'string' ? result.content : JSON.stringify(result.content, null, 2)) || '**Task Completed** (No content returned)';
            
            // Check for artifacts
            const { artifacts: newArtifacts, cleanedContent } = parseArtifactsFromContent(finalContent);
            if (newArtifacts.length > 0) {
                newArtifacts.forEach(a => {
                    addArtifact(a as Artifact);
                    // Persist to server (fire and forget)
                    saveArtifact(a as any).catch(err => console.error('Failed to save artifact:', err));
                });
                finalContent = cleanedContent;
            }

            // DETECT PERMISSION REQUEST
            if (result.metadata?.type === 'permission_request' || finalContent.includes('[PERMISSION_REQUEST:')) {
                const permissionType = result.metadata?.permission || finalContent.match(/PERMISSION_REQUEST:([A-Z]+)/)?.[1]?.toLowerCase();
                
                if (permissionType && ['gmail', 'calendar', 'sheets', 'drive'].includes(permissionType)) {
                     setState(prev => {
                        if (prev.permissions.some(p => p.id === permissionType)) return prev; // Already requested
                        
                        const icons: any = { gmail: 'mail', calendar: 'calendar', sheets: 'table', drive: 'hard-drive' }; // Simple mapping logic needed

                        return {
                            ...prev,
                            permissions: [...prev.permissions, {
                                id: permissionType,
                                name: permissionType.charAt(0).toUpperCase() + permissionType.slice(1),
                                icon: icons[permissionType] || 'lock',
                                email: user?.email || 'unknown@user.com',
                                description: result.metadata?.reason || `Agent requested access to ${permissionType} to perform this task.`,
                                status: 'pending',
                                tools: ['Read', 'Write']
                            }]
                        };
                     });
                     setShowPermissions(true);
                }
            }

            // AUTO-OPEN HIRE MODAL (Only if not already hired)
            if (result.metadata?.type === 'hire_modal' && !isHired) {
                const plan = result.metadata.data?.plan === 'empire' ? 'empire' : 'specialist';
                openHireModal(plan);
            }

            updateMessage(activeJob.messageId, {
                content: finalContent,
                metadata: result.metadata,
                thinking: {
                    isThinking: false,
                    steps: thoughts.map(t => ({
                        id: t.id,
                        toolName: t.title,
                        description: t.detail || '',
                        status: 'completed',
                    })),
                    plan: []
                }
            });
            setActiveJob(null); // Stop polling
            setIsProcessing(false);
            focusInput(); // Refocus input after response
            setStreamingMessageId(activeJob.messageId); // Trigger typewriter
            // Mark discovery as complete but keep bar visible briefly
            setIsDiscoveryActive(false);
            setIsFirstDiscovery(false); // Next discovery won't auto-expand
            setTimeout(() => setShowDiscoveryBar(false), 5000); // Auto-hide after 5s
        }

        // 3. Handle Failure
        if (job?.status === 'failed') {
             updateMessage(activeJob.messageId, {
                content: `**Task Failed**: ${job.error || 'Unknown error'}`,
                thinking: { isThinking: false, steps: [], plan: [] }
            });
            setActiveJob(null);
            setIsProcessing(false);
            focusInput(); // Refocus input after failure
        }
    }, [job, thoughts, isComplete, activeJob, updateMessage]);

    const handleToggleTool = (tool: AvailableTool) => {
        setSelectedTools(prev =>
            prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
        );
    };

    // --- File Handling ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newAttachments = Array.from(e.target.files).map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
            }));
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleAudioComplete = async (audioBlob: Blob) => {
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
             const base64Audio = reader.result as string; 
             // Auto-submit audio for now, or append as attachment?
             // Let's create a specialized submission for audio
             submitMessage('', base64Audio);
        };
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

    // --- Persistence Logic ---

    // Load sessions on mount
    // Session hydration is now handled by the parent/dashboard layout
    // to prevent remount loops resulting from store updates.

    // Track sessions for persistence
    const sessions = useAgentChatStore(state => state.sessions);
    const prevSessionCountRef = useRef(sessions.length);

    // Save when new session is created (detects session array growth)
    useEffect(() => {
        if (user?.uid && sessions.length > prevSessionCountRef.current) {
            // New session was added - save it immediately
            const newestSession = sessions[0]; // Sessions are prepended
            if (newestSession) {
                saveChatSession(newestSession).catch(err => 
                    console.error("Failed to save new session:", err)
                );
            }
        }
        prevSessionCountRef.current = sessions.length;
    }, [sessions.length, user]);

    // Save active session on message change (debounced)
    useEffect(() => {
        const { activeSessionId, sessions: storeSessions } = useAgentChatStore.getState();
        if (activeSessionId && user?.uid) {
            const session = storeSessions.find(s => s.id === activeSessionId);
            if (session && session.messages.length > 0) {
                const timeoutId = setTimeout(() => {
                    saveChatSession(session).catch(err => console.error("Failed to save session:", err));
                }, 2000); // 2s debounce
                return () => clearTimeout(timeoutId);
            }
        }
    }, [currentMessages, user]); // Trigger save when messages change


    // --- Scrolling Logic ---
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
        }
    }, []);

    // --- Focus Management ---
    const focusInput = useCallback(() => {
        // Small delay to ensure DOM updates are complete
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                // On mobile, scroll the input into view to prevent keyboard from hiding it
                if (isMobile) {
                    textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    }, [isMobile]);

    // Textarea height auto-adjustment
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);


    // Scroll on message change or thinking state change
    useEffect(() => {
        // Only scroll if we have messages
        if (currentMessages.length > 0) {
            // If it's the first message or a new message, scroll
            scrollToBottom();
        }
    }, [currentMessages.length, isProcessing, scrollToBottom]);

    // Constant scroll during typewriter effect
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (streamingMessageId) {
            intervalId = setInterval(() => {
                scrollToBottom('auto'); // Use 'auto' for frequent updates to avoid jitter
            }, 100);
        }
        return () => clearInterval(intervalId);
    }, [streamingMessageId, scrollToBottom]);

    // Initial scroll on mount/session switch
    useEffect(() => {
        scrollToBottom('auto');
    }, [useAgentChatStore.getState().activeSessionId, scrollToBottom]);

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

    const convertAttachments = async () => {
        return Promise.all(attachments.map(async (a) => {
            return new Promise<{ name: string, type: string, base64: string }>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(a.file);
                reader.onloadend = () => {
                    resolve({
                        name: a.file.name,
                        type: a.file.type,
                        base64: reader.result as string
                    });
                };
            });
        }));
    };

// ... keep existing code until submitMessage ...

    const submitMessage = async (textInput: string, audioBase64?: string) => { // async fix
        if ((!textInput.trim() && !audioBase64 && attachments.length === 0) || isProcessing) return;

        const userInput = textInput;
        const displayContent = audioBase64 ? '🎤 Voice Message' : (userInput || (attachments.length > 0 ? `Sent ${attachments.length} attachment(s)` : ''));

        // Detect Preset / Intercept Logic (Client-Side Demo Optimization)
        const trimmedInput = textInput.trim();
        const demoIntercept = PRESET_RESPONSES[trimmedInput];

        // SPECIAL INTERCEPT: Open Smokey Widget for Budtender Demo

        
        // SPECIAL CASE: Market Scout needs location context
        // Supports both Dispensary mode (Spy on Competitors) and Brand mode (Find retail partners)
        if (trimmedInput.includes("Hire a Market Scout")) {
             // Detect if this is Brand mode (retail partners) vs Dispensary mode (competitors)
             const isBrandMode = trimmedInput.includes("Find retail partners") || trimmedInput.includes("retail partner");
             
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({
                id: thinkingId,
                type: 'agent',
                content: '',
                timestamp: new Date(),
                // Start with isThinking: false for presets to keep it "Simple"
                thinking: { isThinking: false, steps: [], plan: [] }
             });
             setStreamingMessageId(null);

             if (locationInfo?.city || trimmedInput.match(/^\d{5}$/)) {
                 // CASE A: We have location (either from context or user just typed zip)
                 const zipOrCity = trimmedInput.match(/^\d{5}$/) ? trimmedInput : (locationInfo?.city || "your area");
                 
                 // Start "Thinking" with detailed steps - context-aware labels
                 const step1Id = Math.random().toString(36).substr(2,9);
                 const scanLabel = isBrandMode ? "Retail Discovery" : "Active Recon";
                 const scanDesc = isBrandMode 
                     ? `Finding dispensary partners near ${zipOrCity}...`
                     : `Initializing scan for ${zipOrCity}...`;
                 
                 updateMessage(thinkingId, {
                    thinking: { isThinking: true, steps: [{ id: step1Id, toolName: scanLabel, description: scanDesc, status: 'in-progress', durationMs: 0 }], plan: [] }
                 });

                 // Call Server Action
                 const { searchDemoRetailers } = await import('@/app/dashboard/intelligence/actions/demo-setup');
                 
                 // Update step to "Scanning"
                 await new Promise(r => setTimeout(r, 800)); // Visual pacing
                 updateMessage(thinkingId, {
                    thinking: { isThinking: true, steps: [
                        { id: step1Id, toolName: scanLabel, description: `${isBrandMode ? 'Found dispensaries' : 'Scanning dispensaries'} near ${zipOrCity}...`, status: 'completed', durationMs: 800 },
                        { id: 'scan', toolName: isBrandMode ? "Partner Matching" : "Menu Crawler", description: isBrandMode ? "Analyzing dispensary profiles for fit..." : "Browsing competitor sites (BakedBot Discovery)...", status: 'in-progress' }
                    ], plan: [] }
                 });

                 const result = await searchDemoRetailers(zipOrCity);
                 
                 // Simulate "Deep Dive" time if we got results
                 await new Promise(r => setTimeout(r, 1200));

                 if (result.success && result.daa) {
                     const retailers = result.daa.slice(0, 5); // Top 5
                     const count = result.daa.length;
                     const enrichedRetailer = result.daa.find((c: any) => c.isEnriched);

                     if (isBrandMode) {
                         // ============================================
                         // BRAND MODE: Retail Partner Discovery Report
                         // ============================================
                         
                         // Analyze partner fit
                         const premiumPartners = retailers.filter((c: any) => c.pricingStrategy?.includes('Premium'));
                         const highVolumePartners = retailers.filter((c: any) => c.skuCount > 300);
                         
                         // Build partner table
                         let tableRows = retailers.map((c: any) => 
                            `| **${c.name}** ${c.isEnriched ? '✅' : ''} | ${c.address ? c.address.slice(0, 30) + '...' : c.city} | ${c.skuCount} SKUs | ${c.pricingStrategy === 'Premium' ? '💎 Premium' : '📦 Standard'} | ${c.riskScore === 'Low' ? '🟢 Good' : '🟡 Review'} |`
                         ).join('\n');
                         
                         // Deep dive insight
                         let deepDive = '';
                         if (enrichedRetailer) {
                             deepDive = `**🔬 Featured Partner: ${enrichedRetailer.name}**\n${enrichedRetailer.enrichmentSummary}\n\n`;
                         }

                         const reportContent = `## 🏪 Retail Partner Discovery - ${result.location}\n` +
                            `**🤝 PARTNER OPPORTUNITIES** - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n` +
                            `---\n\n` +
                            `### 💡 MARKET OVERVIEW\n` +
                            `Found **${count} dispensaries** in ${result.location} that could carry your products.\n\n` +
                            `- **Premium Retailers**: ${premiumPartners.length} (ideal for premium product lines)\n` +
                            `- **High-Volume Stores**: ${highVolumePartners.length} (large menu = more shelf space)\n\n` +
                            `---\n\n` +
                            `### 📍 POTENTIAL RETAIL PARTNERS\n\n` +
                            `| Dispensary | Location | Menu Size | Market Position | Partner Fit |\n` +
                            `| :--- | :--- | :--- | :--- | :--- |\n` +
                            tableRows + `\n\n` +
                            deepDive +
                            `---\n\n` +
                            `### 🎯 RECOMMENDED APPROACH\n` +
                            `1. **Start with ${premiumPartners[0]?.name || 'premium retailers'}** — Ideal for brand-building\n` +
                            `2. **Target ${highVolumePartners[0]?.name || 'high-volume stores'}** — Maximum reach potential\n` +
                            `3. **Prepare sell sheets** with margin analysis for each partner tier\n\n` +
                            `---\n\n` +
                            `### 🚀 Next Steps\n\n` +
                            `Create a **Free Account** to:\n` +
                            `- ✅ Track which dispensaries carry your brand\n` +
                            `- ✅ Monitor your brand footprint across all retailers\n` +
                            `- ✅ Get alerts when new dispensaries open in your target markets\n\n` +
                            `[**Create Free Account →**](/claim)`;

                         updateMessage(thinkingId, {
                             content: reportContent,
                             thinking: { isThinking: false, steps: [
                                 { id: step1Id, toolName: "Retail Discovery", description: `Found ${count} dispensaries`, status: 'completed' },
                                 { id: 'scan', toolName: "Partner Matching", description: `Analyzed ${enrichedRetailer?.name || 'retailers'}`, status: 'completed' },
                                 { id: 'done', toolName: "Partner Report", description: "Opportunities identified", status: 'completed' }
                             ], plan: [] }
                         });
                     } else {
                         // ============================================
                         // DISPENSARY MODE: Competitor Analysis Report
                         // ============================================
                         const competitors = retailers;
                         
                         // Analyze pricing strategies
                         const premiumComps = competitors.filter((c: any) => c.pricingStrategy?.includes('Premium'));
                         const aggressiveComps = competitors.filter((c: any) => c.pricingStrategy?.includes('Aggressive'));
                         const standardComps = competitors.filter((c: any) => c.pricingStrategy === 'Standard');
                         
                         // Build competitor table
                         let tableRows = competitors.map((c: any) => 
                            `| **${c.name}** ${c.isEnriched ? '✅' : ''} | ${c.address ? c.address.slice(0, 30) + '...' : c.city} | ${c.pricingStrategy} | ${c.skuCount} SKUs | ${c.riskScore === 'Low' ? '🟢 Low' : '🟡 Med'} |`
                         ).join('\n');
                         
                         // Build pricing insights
                         let pricingInsight = '';
                         if (premiumComps.length > 0) {
                             pricingInsight = `**${premiumComps[0].name}** leads with premium positioning (+15% above market). `;
                         }
                         if (aggressiveComps.length > 0) {
                             pricingInsight += `**${aggressiveComps[0].name}** running aggressive promotions—potential price war.`;
                         }
                         if (!pricingInsight) {
                             pricingInsight = `Market pricing is relatively stable with ${standardComps.length} dispensaries at standard rates.`;
                         }
                         
                         // Deep dive insight
                         let deepDive = '';
                         if (enrichedRetailer) {
                             deepDive = `**🔬 Deep Dive: ${enrichedRetailer.name}**\n${enrichedRetailer.enrichmentSummary}\n\n`;
                         }

                         const reportContent = `## 🔥 Cannabis Market Intelligence - ${result.location}\n` +
                            `**📊 COMPETITIVE ANALYSIS** - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n` +
                            `---\n\n` +
                            `### 💰 KEY PRICING INSIGHTS\n` +
                            `${pricingInsight}\n\n` +
                            `- **Premium Positioned**: ${premiumComps.length} dispensaries (${Math.round(premiumComps.length/count*100)}%)\n` +
                            `- **Standard Pricing**: ${standardComps.length} dispensaries (${Math.round(standardComps.length/count*100)}%)\n` +
                            `- **Aggressive Promos**: ${aggressiveComps.length} dispensaries\n\n` +
                            `---\n\n` +
                            `### 📍 COMPETITOR BREAKDOWN (${count} Total)\n\n` +
                            `| Dispensary | Location | Pricing | Menu Size | Risk |\n` +
                            `| :--- | :--- | :--- | :--- | :--- |\n` +
                            tableRows + `\n\n` +
                            deepDive +
                            `---\n\n` +
                            `### 🎯 MARGIN OPPORTUNITIES\n` +
                            `- **Price Increase Candidates**: High-THC strains with limited competition in ${result.location}\n` +
                            `- **Bundle Opportunity**: Create value bundles to compete with ${aggressiveComps[0]?.name || 'aggressive discounters'}\n` +
                            `- **Exclusivity Play**: Partner with premium brands not carried by competitors\n\n` +
                            `---\n\n` +
                            `### 🚨 COMPETITOR VULNERABILITIES\n` +
                            `- ${premiumComps[0]?.name || 'Premium competitors'} may lose price-sensitive customers\n` +
                            `- ${count - (enrichedRetailer ? 1 : 0)} competitors lack verified loyalty programs\n` +
                            `- Opportunity: Position on quality + service vs. price wars\n\n` +
                            `---\n\n` +
                            `### ✅ NEXT STEPS\n` +
                            `- ✓ Set up automated price monitoring for top ${Math.min(count, 5)} competitors\n` +
                            `- ✓ Analyze ${enrichedRetailer?.name || 'top competitor'}'s bestsellers for counter-positioning\n` +
                            `- ✓ Launch Daily Competitive Intel playbook for real-time alerts\n\n` +
                            `---\n\n` +
                            `### 🚀 Automate This Report\n\n` +
                            `Create a **Free Account** and launch the **Daily Competitive Intelligence Report** playbook.\n\n` +
                            `**What you get:**\n` +
                            `- ✅ Monitor ${count}+ competitors automatically\n` +
                            `- ✅ Daily pricing change alerts\n` +
                            `- ✅ Weekly market summary like this one\n\n` +
                            `[**Create Free Account →**](/claim)`;

                         updateMessage(thinkingId, {
                             content: reportContent,
                             thinking: { isThinking: false, steps: [
                                 { id: step1Id, toolName: "Active Recon", description: `Found ${count} locations`, status: 'completed' },
                                 { id: 'scan', toolName: "BakedBot Discovery", description: `Analyzed ${enrichedRetailer?.name || 'competitors'}`, status: 'completed' },
                                 { id: 'done', toolName: "Intel Report", description: "Risk analysis complete", status: 'completed' }
                             ], plan: [] }
                         });
                     }
                 } else {
                     // Error State
                     updateMessage(thinkingId, {
                         content: "I encountered an issue scanning that location. Please try a valid Zip Code.",
                         thinking: { isThinking: false, steps: [{ id: 'err', toolName: "Error", description: "Location not found", status: 'failed' }], plan: [] }
                     });
                 }
                 
                 setIsProcessing(false);
                 focusInput(); // Refocus input after Market Scout report
                 setStreamingMessageId(thinkingId);
             } else {
                 // CASE B: Ask for Location (Preserved)
                 const locationPrompt = isBrandMode
                     ? "I can find dispensary partners for your brand. **What City or Zip Code should I search?**"
                     : "I'm ready to audit your local market. **What City or Zip Code should I scan?**";
                 
                  setTimeout(() => {
                    updateMessage(thinkingId, {
                        content: locationPrompt,
                        thinking: { isThinking: false, steps: [], plan: [] }
                    });
                    setIsProcessing(false);
                    focusInput(); // Refocus input after location prompt
                    setStreamingMessageId(thinkingId);
                 }, 800);
             }
             return;
        }


        // ---------------------------------------------------------
        // DYNAMIC PRESET: SMOKEY (Digital Budtender Demo)
        // ---------------------------------------------------------
        // ---------------------------------------------------------
        // DYNAMIC PRESET: SMOKEY (Digital Budtender Demo)
        // ---------------------------------------------------------
        if (trimmedInput.includes("Digital Budtender") || trimmedInput.includes("See my")) {
             // Dispatch event to open widget
             window.dispatchEvent(new Event('open-smokey-widget'));

             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); 
             
             // Immediate Agent Response (No Thinking Window)
             const agentMsgId = `agent-${Date.now()}`;
             
             const responseContent = `**🌿 Smokey Activated**\n\n` +
                `I've opened the Digital Budtender widget for you (look for the popup).\n\n` +
                `It's currently showcasing **40 Tons** products to demonstrate our semantic search capabilities.\n\n` +
                `[**View Full Demo Experience →**](https://bakedbot.ai/shop/demo)`;

             addMessage({ 
                 id: agentMsgId, 
                 type: 'agent', 
                 content: responseContent, 
                 timestamp: new Date(), 
                 thinking: { isThinking: false, steps: [], plan: [] } 
             });
             
             setIsProcessing(false);
             focusInput(); // Refocus input after Smokey activation
             setStreamingMessageId(agentMsgId);
             return;
        }

        // ---------------------------------------------------------
        // DYNAMIC PRESET: CRAIG (Draft Campaign)
        // ---------------------------------------------------------
        if (trimmedInput.includes("Draft a New Drop") || trimmedInput.includes("Draft Campaign")) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [], plan: [] } });
             setStreamingMessageId(null);
             
             const step1Id = Math.random().toString(36).substr(2,9);
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [{ id: step1Id, toolName: "Craig", description: "Drafting compliant campaign copy...", status: 'in-progress' }], plan: [] }
             });

             const { getDemoCampaignDraft } = await import('@/app/dashboard/intelligence/actions/demo-presets');
             const result = await getDemoCampaignDraft('New Drop');
             
             await new Promise(r => setTimeout(r, 1000));

             if (result.success && result.campaign) {
                 const c = result.campaign;
                 const reportContent = `**📱 Craig's Campaign Draft: New Drop**\n\n` +
                    `### SMS Message\n` +
                    `> ${c.sms.text}\n\n` +
                    `${c.sms.compliance} | ${c.sms.chars} chars\n\n` +
                    `### Social Media Post\n` +
                    `> ${c.social.text}\n\n` +
                    `${c.social.compliance} | ${c.social.chars} chars\n\n` +
                    `### Email Subject\n` +
                    `**${c.emailSubject}**\n\n` +
                    `_All copy is compliance-checked. Ready to launch?_`;

                 updateMessage(thinkingId, {
                     content: reportContent,
                     thinking: { isThinking: false, steps: [
                         { id: step1Id, toolName: "Craig", description: "Campaign drafted", status: 'completed' },
                         { id: 'deebo', toolName: "Deebo", description: "Compliance verified", status: 'completed' }
                     ], plan: [] }
                 });
             } else {
                 updateMessage(thinkingId, {
                     content: "I had trouble generating the campaign. What kind of promotion are you running?",
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
             }
             
             setIsProcessing(false);
             focusInput(); // Refocus input after campaign draft
             setStreamingMessageId(thinkingId);
             return;
        }

        // ---------------------------------------------------------
        // DYNAMIC PRESET: EZAL (Brand Footprint Audit)
        // ---------------------------------------------------------
        if (trimmedInput.includes("Audit my Brand") || trimmedInput.includes("Brand Footprint")) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [], plan: [] } });
             setStreamingMessageId(null);
             
             // ASK FOR BRAND NAME instead of hallucinating results immediately
             setTimeout(() => {
                 updateMessage(thinkingId, {
                     content: "I can definitely audit your brand's digital footprint.\n\n**What is the name of your brand?**",
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
                 setIsProcessing(false);
                 focusInput(); // Refocus input after brand audit prompt
                 setStreamingMessageId(thinkingId);
             }, 800);
             return;
        }

        // ---------------------------------------------------------
        // FOLLOW-UP: Brand Name Input (after Audit my Brand prompt)
        // ---------------------------------------------------------
        const lastBotMsg = currentMessages[currentMessages.length - 1];
        const askedForBrandName = lastBotMsg?.type === 'agent' && lastBotMsg.content.includes("What is the name of your brand?");
        
        if (askedForBrandName && trimmedInput.length > 1 && trimmedInput.length < 100) {
             const brandName = trimmedInput;
             
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: brandName, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [], plan: [] } });
             setStreamingMessageId(null);
             
             const step1Id = Math.random().toString(36).substr(2,9);
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [{ id: step1Id, toolName: "Ezal", description: `Searching for "${brandName}" across dispensary menus...`, status: 'in-progress' }], plan: [] }
             });

             // Simulate search with real retailer data
             const { searchDemoRetailers } = await import('@/app/dashboard/intelligence/actions/demo-setup');
             
             await new Promise(r => setTimeout(r, 1000));
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [
                    { id: step1Id, toolName: "Ezal", description: `Scanning dispensary networks for "${brandName}"...`, status: 'completed', durationMs: 1000 },
                    { id: 'scan', toolName: "Brand Discovery", description: "Analyzing digital footprint...", status: 'in-progress' }
                ], plan: [] }
             });
             
             // Get some retailers to reference in the audit
             const result = await searchDemoRetailers(locationInfo?.city || "Denver");
             
             await new Promise(r => setTimeout(r, 1200));
             
             // Generate simulated brand audit results
             const carriedByCount = Math.floor(Math.random() * 8) + 2; // 2-10 retailers
             const totalRetailers = result.success && result.daa ? result.daa.length : 15;
             const marketPenetration = Math.round((carriedByCount / totalRetailers) * 100);
             const avgPrice = (Math.random() * 20 + 30).toFixed(2); // $30-50
             const competitorBrands = ['Raw Garden', 'Stiiizy', 'Connected', 'Alien Labs', 'Cookies'];
             const randomCompetitors = competitorBrands.sort(() => 0.5 - Math.random()).slice(0, 3);
             
             // Build sample retailer list from actual data if available
             let sampleRetailers = '';
             if (result.success && result.daa) {
                 const retailers = result.daa.slice(0, 3);
                 sampleRetailers = retailers.map((r: any) => `- **${r.name}** (${r.city || 'Location N/A'})`).join('\n');
             } else {
                 sampleRetailers = '- *Location data not available - create account to unlock*';
             }
             
             const auditContent = `## 🔍 Brand Footprint Audit: ${brandName}\n` +
                `**📊 DIGITAL PRESENCE ANALYSIS** - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n` +
                `---\n\n` +
                `### 📈 MARKET PENETRATION\n` +
                `- **Retailers Carrying ${brandName}**: ${carriedByCount} dispensaries\n` +
                `- **Market Penetration**: ${marketPenetration}% in ${locationInfo?.city || 'target market'}\n` +
                `- **Avg. Retail Price**: $${avgPrice}\n\n` +
                `---\n\n` +
                `### 🏪 SAMPLE RETAILERS CARRYING ${brandName.toUpperCase()}\n` +
                `${sampleRetailers}\n\n` +
                `---\n\n` +
                `### ⚔️ COMPETITIVE LANDSCAPE\n` +
                `Top competing brands in same category:\n` +
                randomCompetitors.map((c, i) => `${i + 1}. **${c}**`).join('\n') + `\n\n` +
                `---\n\n` +
                `### 🎯 GROWTH OPPORTUNITIES\n` +
                `- **${totalRetailers - carriedByCount} dispensaries** don't carry ${brandName} yet\n` +
                `- Premium retailers in this market are underrepresented\n` +
                `- Opportunity to expand in adjacent ZIP codes\n\n` +
                `---\n\n` +
                `### 🚀 Next Steps\n\n` +
                `Create a **Free Account** to:\n` +
                `- ✅ Monitor all ${carriedByCount}+ retailers carrying ${brandName}\n` +
                `- ✅ Get alerts when new stores add your brand\n` +
                `- ✅ Track competitor pricing and availability\n\n` +
                `[**Create Free Account →**](/claim)`;

             updateMessage(thinkingId, {
                 content: auditContent,
                 thinking: { isThinking: false, steps: [
                     { id: step1Id, toolName: "Ezal", description: `Found ${carriedByCount} retailers`, status: 'completed' },
                     { id: 'scan', toolName: "Brand Discovery", description: `Analyzed ${brandName} footprint`, status: 'completed' },
                     { id: 'done', toolName: "Audit Complete", description: "Report generated", status: 'completed' }
                 ], plan: [] }
             });
             
             setIsProcessing(false);
             focusInput();
             setStreamingMessageId(thinkingId);
             return;
        }

        // ---------------------------------------------------------
        // DYNAMIC PRESET: MONEY MIKE (Pricing Plans)
        // ---------------------------------------------------------
        if (trimmedInput.toLowerCase().includes("pricing plan") || trimmedInput.toLowerCase().includes("what are the price")) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [], plan: [] } });
             setStreamingMessageId(null);
             
             const step1Id = Math.random().toString(36).substr(2,9);
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [{ id: step1Id, toolName: "Money Mike", description: "Pulling pricing data...", status: 'in-progress' }], plan: [] }
             });

             const { getDemoPricingPlans } = await import('@/app/dashboard/intelligence/actions/demo-presets');
             const result = await getDemoPricingPlans();
             
             await new Promise(r => setTimeout(r, 600));

             if (result.success && result.plans) {
                 const plans = result.plans;
                 let planBlocks = plans.map((p: any) => 
                    `### ${p.name} ${p.badge || ''}\n**${p.price}**\n` +
                    p.features.map((f: string) => `- ${f}`).join('\n') +
                    (p.recommended ? '\n\n> 💎 **Recommended**' : '')
                 ).join('\n\n');
                 
                 const reportContent = `**💰 BakedBot Pricing Plans**\n\n` +
                    planBlocks + `\n\n` +
                    `---\n${result.roiNote}`;

                 updateMessage(thinkingId, {
                     content: reportContent,
                     thinking: { isThinking: false, steps: [
                         { id: step1Id, toolName: "Money Mike", description: "Plans loaded", status: 'completed' }
                     ], plan: [] }
                 });
             } else {
                 updateMessage(thinkingId, {
                     content: "Visit bakedbot.ai/pricing for our latest plans!",
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
             }
             
             setIsProcessing(false);
             focusInput(); // Refocus input after pricing plans
             setStreamingMessageId(thinkingId);
             return;
        }

// ... (Top of file modifications handled by removing from PRESET_RESPONSES below)

// Inside submitMessage function, before PRESET_RESPONSES check:

        // ---------------------------------------------------------
        // DYNAMIC PRESET: DEEBO (Compliance Scan)
        // ---------------------------------------------------------
        if (trimmedInput.includes("Send Deebo") || trimmedInput.includes("compliance check")) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: false, steps: [], plan: [] } });
             setStreamingMessageId(null);
             
             setTimeout(() => {
                 updateMessage(thinkingId, {
                     content: "Deebo is on it. I can audit any webpage for compliance risks.\n\n**Paste the URL you want me to scan.**",
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
                 setIsProcessing(false);
                 focusInput(); // Refocus input after Deebo compliance prompt
             }, 800);
             return;
        }

        // DETECT URL (Context: Compliance)
        // Simple URL regex for demo (http/https optional)
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        
        // Check if last bot message asked for URL (context)
        const lastBot = currentMessages[currentMessages.length - 1];
        const isUrlInput = urlRegex.test(trimmedInput);
        const askedForUrl = lastBot?.type === 'agent' && lastBot.content.includes("Paste the URL");

        if (askedForUrl && isUrlInput) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `thinking-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{id: 'init', toolName: 'Deebo', description: 'Initializing...', status: 'in-progress'}], plan: [] } });
             setStreamingMessageId(null);

             // Dynamic Import
             const { scanDemoCompliance } = await import('@/app/dashboard/intelligence/actions/demo-compliance');
             const targetUrl = trimmedInput;

             // Thinking Animation
             const step1Id = Math.random().toString(36).substr(2,9);
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [
                    { id: step1Id, toolName: "Site Visitor", description: `Visiting ${targetUrl} (BakedBot Discovery)...`, status: 'in-progress', durationMs: 0 }
                ], plan: [] }
             });

             const result = await scanDemoCompliance(targetUrl);
             
             // Visual pacing for "Reading"
             await new Promise(r => setTimeout(r, 1500));
             
             if (result.success && result.details) {
                  updateMessage(thinkingId, {
                    thinking: { isThinking: true, steps: [
                        { id: step1Id, toolName: "Site Visitor", description: `Scraped ${targetUrl}`, status: 'completed', durationMs: 1200 },
                        { id: 'audit', toolName: "Compliance Engine", description: "Checking against 21 CFR 111 & State Rules...", status: 'in-progress' }
                    ], plan: [] }
                 });
                 
                 await new Promise(r => setTimeout(r, 1000));

                 const color = result.riskScore === 'High' ? '🔴' : (result.riskScore === 'Medium' ? '🟡' : '🟢');
                 const report = `**Compliance Audit: ${targetUrl}**\n\n` +
                 `**Risk Level**: ${color} **${result.riskScore}**\n\n` +
                 `**Findings**:\n` +
                 result.details.violations.map((v:string) => `*   ❌ **VIOLATION**: ${v}`).join('\n') + '\n' +
                 result.details.warnings.map((w:string) => `*   ⚠️ **Warning**: ${w}`).join('\n') + '\n' +
                 result.details.passing.map((p:string) => `*   ✅ ${p}`).join('\n') + 
                 `\n\n**Recommendation**: ${result.riskScore === 'Low' ? 'Assets appear compliant.' : 'Review flagged items immediately before publishing.'}`;

                 updateMessage(thinkingId, {
                     content: report,
                     thinking: { isThinking: false, steps: [
                         { id: step1Id, toolName: "Site Visitor", description: "Site scanned", status: 'completed' },
                         { id: 'audit', toolName: "Compliance Engine", description: "Audit complete", status: 'completed' }
                     ], plan: [] }
                 });

             } else {
                 updateMessage(thinkingId, {
                     content: "I couldn't access that URL. Please make sure it's public and try again.",
                     thinking: { isThinking: false, steps: [{id: 'err', toolName: 'Error', description: 'Access denied', status: 'failed'}], plan: [] }
                 });
             }
             
             setIsProcessing(false);
             setStreamingMessageId(thinkingId);
             return;
        }

        // DETECT BRAND NAME (Context: Ezal Audit)
        const lastBotBrand = currentMessages[currentMessages.length - 1];
        const askedForBrand = lastBotBrand?.type === 'agent' && lastBotBrand.content.includes("What is the name of your brand?");

        if (askedForBrand) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `thinking-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [], plan: [] } });
             setStreamingMessageId(null);

             const brandName = trimmedInput;
             
             const step1Id = Math.random().toString(36).substr(2,9);
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [{ id: step1Id, toolName: "Ezal", description: `Scanning footprint for ${brandName}...`, status: 'in-progress' }], plan: [] }
             });

             const { getDemoBrandFootprint } = await import('@/app/dashboard/intelligence/actions/demo-presets');
             const result = await getDemoBrandFootprint(brandName);
             
             await new Promise(r => setTimeout(r, 1500));

             if (result.success && result.audit) {
                 const a = result.audit;
                 const reportContent = `**👁️ Ezal's Brand Footprint Audit: ${a.brandName}**\n\n` +
                    `**Estimated Retail Partners**: ${a.estimatedRetailers}\n\n` +
                    `**Top Markets**\n` +
                    a.topMarkets.map((m: string) => `- ✅ ${m}`).join('\n') + `\n\n` +
                    `**Coverage Gaps** (Opportunities)\n` +
                    a.coverageGaps.map((m: string) => `- ⚠️ ${m}`).join('\n') + `\n\n` +
                    `**SEO Opportunities**\n` +
                    a.seoOpportunities.map((k: string) => `- 🔍 "${k}"`).join('\n') + `\n\n` +
                    `**Key Competitors**\n` +
                    a.competitorOverlap.map((c: string) => `- 🏷️ ${c}`).join('\n') + `\n\n` +
                    `_Want a deeper competitive analysis? Hire Ezal full-time._`;

                 updateMessage(thinkingId, {
                     content: reportContent,
                     thinking: { isThinking: false, steps: [
                         { id: step1Id, toolName: "Ezal", description: `Found ${a.estimatedRetailers} partners`, status: 'completed' },
                         { id: 'seo', toolName: "SEO Scanner", description: "Keywords analyzed", status: 'completed' }
                     ], plan: [] }
                 });
             } else {
                 updateMessage(thinkingId, {
                     content: "I hit a snag analyzing that brand. Please try again.",
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
             }
             
             setIsProcessing(false);
             setStreamingMessageId(thinkingId);
             return;
        }

        const zipRegex = /^\d{5}$/;
        // City heuristic: 3-30 chars, letters/spaces only, not a URL or command
        const isCityName = /^[a-zA-Z\s]{3,30}$/.test(trimmedInput) && !trimmedInput.toLowerCase().includes('http');
        const isZipOrCity = zipRegex.test(trimmedInput) || isCityName;
        
        // If last message asked for location (We can check if last bot message contains "What City or Zip")
        const lastBotMsgForLocation = currentMessages[currentMessages.length - 1];
        const askedForLocation = lastBotMsgForLocation?.type === 'agent' && lastBotMsgForLocation.content.includes("What City or Zip Code");

        if (askedForLocation && isZipOrCity) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `thinking-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [], plan: [] } });
             setStreamingMessageId(null);
             
             // REAL LIVE DATA: Use searchDemoRetailers
             const locationName = trimmedInput;
             const step1Id = Math.random().toString(36).substr(2,9);
             
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [{ id: step1Id, toolName: "Active Recon", description: `Scanning dispensaries near ${locationName}...`, status: 'in-progress', durationMs: 0 }], plan: [] }
             });

             // Call Server Action
             const { searchDemoRetailers } = await import('@/app/dashboard/intelligence/actions/demo-setup');
             
             // Update step to "Scanning"
             await new Promise(r => setTimeout(r, 800)); // Visual pacing
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [
                    { id: step1Id, toolName: "Active Recon", description: `Scanning dispensaries near ${locationName}...`, status: 'completed', durationMs: 800 },
                    { id: 'scan', toolName: "Menu Crawler", description: "Browsing competitor sites (BakedBot Discovery)...", status: 'in-progress' }
                ], plan: [] }
             });

             const result = await searchDemoRetailers(locationName);
             
             // Simulate "Deep Dive" time if we got results
             await new Promise(r => setTimeout(r, 1200));

             if (result.success && result.daa) {
                 // Success! Format the report
                 const competitors = result.daa.slice(0, 5); // Top 5 for richer report
                 const count = result.daa.length;
                 const enrichedComp = result.daa.find((c: any) => c.isEnriched);
                 
                 // Analyze pricing strategies
                 const premiumComps = competitors.filter((c: any) => c.pricingStrategy?.includes('Premium'));
                 const aggressiveComps = competitors.filter((c: any) => c.pricingStrategy?.includes('Aggressive'));
                 const standardComps = competitors.filter((c: any) => c.pricingStrategy === 'Standard');
                 
                 // Build competitor table
                 let tableRows = competitors.map((c: any) => 
                    `| **${c.name}** ${c.isEnriched ? '✅' : ''} | ${c.address ? c.address.slice(0, 30) + '...' : c.city} | ${c.pricingStrategy} | ${c.skuCount} SKUs | ${c.riskScore === 'Low' ? '🟢 Low' : '🟡 Med'} |`
                 ).join('\n');
                 
                 // Build pricing insights
                 let pricingInsight = '';
                 if (premiumComps.length > 0) {
                     pricingInsight = `**${premiumComps[0].name}** leads with premium positioning (+15% above market). `;
                 }
                 if (aggressiveComps.length > 0) {
                     pricingInsight += `**${aggressiveComps[0].name}** running aggressive promotions—potential price war.`;
                 }
                 if (!pricingInsight) {
                     pricingInsight = `Market pricing is relatively stable with ${standardComps.length} dispensaries at standard rates.`;
                 }
                 
                 // Deep dive insight
                 let deepDive = '';
                 if (enrichedComp) {
                     deepDive = `**🔬 Deep Dive: ${enrichedComp.name}**\n${enrichedComp.enrichmentSummary}\n\n`;
                 }

                 const reportContent = `## 🔥 Cannabis Market Intelligence - ${result.location}\n` +
                    `**📊 COMPETITIVE ANALYSIS** - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n` +
                    `---\n\n` +
                    `### 💰 KEY PRICING INSIGHTS\n` +
                    `${pricingInsight}\n\n` +
                    `- **Premium Positioned**: ${premiumComps.length} dispensaries (${Math.round(premiumComps.length/count*100)}%)\n` +
                    `- **Standard Pricing**: ${standardComps.length} dispensaries (${Math.round(standardComps.length/count*100)}%)\n` +
                    `- **Aggressive Promos**: ${aggressiveComps.length} dispensaries\n\n` +
                    `---\n\n` +
                    `### 📍 COMPETITOR BREAKDOWN (${count} Total)\n\n` +
                    `| Dispensary | Location | Pricing | Menu Size | Risk |\n` +
                    `| :--- | :--- | :--- | :--- | :--- |\n` +
                    tableRows + `\n\n` +
                    deepDive +
                    `---\n\n` +
                    `### 🎯 MARGIN OPPORTUNITIES\n` +
                    `- **Price Increase Candidates**: High-THC strains with limited competition in ${result.location}\n` +
                    `- **Bundle Opportunity**: Create value bundles to compete with ${aggressiveComps[0]?.name || 'aggressive discounters'}\n` +
                    `- **Exclusivity Play**: Partner with premium brands not carried by competitors\n\n` +
                    `---\n\n` +
                    `### 🚨 COMPETITOR VULNERABILITIES\n` +
                    `- ${premiumComps[0]?.name || 'Premium competitors'} may lose price-sensitive customers\n` +
                    `- ${count - (enrichedComp ? 1 : 0)} competitors lack verified loyalty programs\n` +
                    `- Opportunity: Position on quality + service vs. price wars\n\n` +
                    `---\n\n` +
                    `### ✅ NEXT STEPS\n` +
                    `- ✓ Set up automated price monitoring for top ${Math.min(count, 5)} competitors\n` +
                    `- ✓ Analyze ${enrichedComp?.name || 'top competitor'}'s bestsellers for counter-positioning\n` +
                    `- ✓ Launch Daily Competitive Intel playbook for real-time alerts\n\n` +
                    `---\n\n` +
                    `### 🚀 Automate This Report\n\n` +
                    `Create a **Free Account** and launch the **Daily Competitive Intelligence Report** playbook.\n\n` +
                    `**What you get:**\n` +
                    `- ✅ Monitor ${count}+ competitors automatically\n` +
                    `- ✅ Daily pricing change alerts\n` +
                    `- ✅ Weekly market summary like this one\n\n` +
                    `[**Create Free Account →**](/claim)`;

                 updateMessage(thinkingId, {
                     content: reportContent,
                     thinking: { isThinking: false, steps: [
                         { id: step1Id, toolName: "Active Recon", description: `Found ${count} locations`, status: 'completed' },
                         { id: 'scan', toolName: "BakedBot Discovery", description: `Analyzed ${enrichedComp?.name || 'competitors'}`, status: 'completed' },
                         { id: 'done', toolName: "Intel Report", description: "Risk analysis complete", status: 'completed' }
                     ], plan: [] }
                 });
             } else {
                 // Error State
                 updateMessage(thinkingId, {
                     content: "I encountered an issue scanning that location. Please try a valid Zip Code.",
                     thinking: { isThinking: false, steps: [{ id: 'err', toolName: "Error", description: "Location not found", status: 'failed' }], plan: [] }
                 });
             }
             
             setIsProcessing(false);
             setStreamingMessageId(thinkingId);
             return;
        }



        // ---------------------------------------------------------
        // DYNAMIC PRESET: CRAIG (Campaign Draft & Live Send)
        // ---------------------------------------------------------
        if (trimmedInput.includes("Draft a New Drop Campaign") || trimmedInput.includes("campaign draft")) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [], plan: [] } });
             setStreamingMessageId(null);
             
             const step1Id = Math.random().toString(36).substr(2,9);
             updateMessage(thinkingId, {
                thinking: { isThinking: true, steps: [{ id: step1Id, toolName: "Craig", description: "Drafting campaign copy...", status: 'in-progress' }], plan: [] }
             });

             const { getDemoCampaignDraft } = await import('@/app/dashboard/intelligence/actions/demo-presets');
             const result = await getDemoCampaignDraft();
             
             await new Promise(r => setTimeout(r, 1000));

             if (result.success && result.campaign) {
                 const c = result.campaign;
                 const draftContent = `**🌿 Campaign Draft: New Drop**\n\n` +
                    `**SMS (${c.sms.chars} chars)**\n` +
                    `> ${c.sms.text}\n` +
                    `_Compliance: ${c.sms.compliance}_\n\n` +
                    `**Email Subject**\n` +
                    `> 📧 ${c.emailSubject}\n\n` +
                    `**Social Post**\n` +
                    `> ${c.social.text}\n\n` +
                    `---\n` +
                    `**🚀 Live Demo: Want to receive this for real?**\n` +
                    `I can send this draft to your phone (SMS) or inbox (Email) right now.\n\n` +
                    `**Reply with "SMS" or "Email".**`;

                 updateMessage(thinkingId, {
                     content: draftContent,
                     thinking: { isThinking: false, steps: [
                         { id: step1Id, toolName: "Craig", description: "Copy generated", status: 'completed' }
                     ], plan: [] }
                 });
             } else {
                 updateMessage(thinkingId, {
                     content: "I couldn't draft the campaign right now. Please try again.",
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
             }
             
             setIsProcessing(false);
             setStreamingMessageId(thinkingId);
             return;
        }

        // DETECT CAMPAIGN SEND INTENT
        const lastBotForCampaign = currentMessages[currentMessages.length - 1];
        const askedForSendMethod = lastBotForCampaign?.type === 'agent' && lastBotForCampaign.content.includes("Reply with \"SMS\" or \"Email\"");
        
        // 1. User chose SMS
        if (askedForSendMethod && (trimmedInput.toLowerCase().includes('sms') || trimmedInput.toLowerCase().includes('text'))) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: "Got it. **What's your mobile number?** (I'll send the test immediately)", timestamp: new Date(), thinking: { isThinking: false, steps: [], plan: [] } });
             setStreamingMessageId(null);
             setIsProcessing(false);
             return;
        }

        // 2. User chose Email
        if (askedForSendMethod && (trimmedInput.toLowerCase().includes('email') || trimmedInput.toLowerCase().includes('mail'))) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `agent-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: "Understood. **What's your email address?**", timestamp: new Date(), thinking: { isThinking: false, steps: [], plan: [] } });
             setStreamingMessageId(null);
             setIsProcessing(false);
             return;
        }

        // 3. User Provided Phone Number (Context: Campaign SMS)
        const lastBotForPhone = currentMessages[currentMessages.length - 1];
        const askedForPhone = lastBotForPhone?.type === 'agent' && lastBotForPhone.content.includes("What's your mobile number");
        const isPhoneNumber = /^[\d\+\-\(\) ]{7,20}$/.test(trimmedInput); // Basic phone regex

        if (askedForPhone && isPhoneNumber) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `thinking-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'init', toolName: "Blackleaf", description: "Connecting to SMS gateway...", status: 'in-progress' }], plan: [] } });
             setStreamingMessageId(null);

             const dummyCampaign = "🌿 BakedBot Demo: This is how your customers will see your SMS campaigns. Reply STOP to opt out.";
             const targetPhone = trimmedInput;

             const { sendDemoSMS } = await import('@/app/dashboard/intelligence/actions/demo-setup');
             
             // Simulate network delay
             await new Promise(r => setTimeout(r, 800));
             
             const result = await sendDemoSMS(targetPhone, dummyCampaign);
             
             if (result.success) {
                 updateMessage(thinkingId, {
                     content: `✅ **SMS Sent!**\n\nChecking your phone now. It should arrive from our Blackleaf shortcode/number.\n\n*Demo complete.*`,
                     thinking: { isThinking: false, steps: [
                         { id: 'init', toolName: "Blackleaf", description: "Gateway connected", status: 'completed' },
                         { id: 'send', toolName: "SMS Dispatch", description: `Sent to ${targetPhone}`, status: 'completed' }
                     ], plan: [] }
                 });
             } else {
                 updateMessage(thinkingId, {
                     content: `❌ **Failed to send SMS**\n\n${result.error}. Please ensure the number is valid.`,
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
             }
             setIsProcessing(false);
             focusInput(); // Refocus input after SMS demo
             setStreamingMessageId(thinkingId);
             return;
        }

        // 4. User Provided Email (Context: Campaign Email)
        const lastBotForEmail = currentMessages[currentMessages.length - 1];
        const askedForEmail = lastBotForEmail?.type === 'agent' && lastBotForEmail.content.includes("What's your email address");
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedInput);

        if (askedForEmail && isEmail) {
             const userMsgId = `user-${Date.now()}`;
             addMessage({ id: userMsgId, type: 'user', content: displayContent, timestamp: new Date() });
             setInput(''); setAttachments([]); setIsProcessing(true);

             const thinkingId = `thinking-${Date.now()}`;
             addMessage({ id: thinkingId, type: 'agent', content: '', timestamp: new Date(), thinking: { isThinking: true, steps: [{ id: 'init', toolName: "Mailjet", description: "Compiling HTML template...", status: 'in-progress' }], plan: [] } });
             setStreamingMessageId(null);
             
             const targetEmail = trimmedInput;
             const dummyHtml = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #059669;">🌿 New Drop Alert</h2>
                    <p>This is a live demo of a <strong>BakedBot Marketing Campaign</strong>.</p>
                    <p>Imagine this email populated with your brand's latest products, automatically sent to your segmented customers.</p>
                    <a href="https://bakedbot.ai" style="display: inline-block; background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Shop Now</a>
                </div>
             `;

             const { sendDemoEmail } = await import('@/app/dashboard/intelligence/actions/demo-setup');
             
             await new Promise(r => setTimeout(r, 1000)); // Pacing

             const result = await sendDemoEmail(targetEmail, dummyHtml);

             if (result.success) {
                 updateMessage(thinkingId, {
                     content: `✅ **Email Sent!**\n\nCheck your inbox (and spam folder) for the test email.\n\n*Demo complete.*`,
                     thinking: { isThinking: false, steps: [
                         { id: 'init', toolName: "Mailjet", description: "Template rendered", status: 'completed' },
                         { id: 'send', toolName: "Email Dispatch", description: `Sent to ${targetEmail}`, status: 'completed' }
                     ], plan: [] }
                 });
             } else {
                 updateMessage(thinkingId, {
                     content: `❌ **Failed to send Email**\n\n${result.error}.`,
                     thinking: { isThinking: false, steps: [], plan: [] }
                 });
             }
             setIsProcessing(false);
             focusInput(); // Refocus input after email demo
             setStreamingMessageId(thinkingId);
             return;
        }

        if (demoIntercept) {
            // ... (Existing logic for other presets)
            // 1. Add User Message
            const userMsgId = `user-${Date.now()}`;
            addMessage({
                id: userMsgId,
                type: 'user',
                content: displayContent,
                timestamp: new Date(),
            });
            setInput('');
            setAttachments([]);
            setIsProcessing(true);

            // 2. Add Thinking/Agent Message Placeholder
            const thinkingId = `thinking-${Date.now()}`;
            addMessage({
                id: thinkingId,
                type: 'agent',
                content: '',
                timestamp: new Date(),
                thinking: { isThinking: true, steps: [], plan: [] }
            });
            setStreamingMessageId(null);

            // 3. Simulate "Work" (Animation) then deliver pre-canned response
            setTimeout(async () => {
                // If the preset has simulated tool steps, show them one by one
                if (demoIntercept.steps && demoIntercept.steps.length > 0) {
                   const stepId = Math.random().toString(36).substr(2, 9);
                   // Show the first step
                    updateMessage(thinkingId, {
                        thinking: {
                            isThinking: true,
                            steps: [{
                                id: stepId,
                                toolName: demoIntercept.steps[0].toolName,
                                description: demoIntercept.steps[0].description,
                                status: 'in-progress',
                                durationMs: 0
                            }],
                            plan: []
                        }
                    });
                    
                    // Wait a bit for "processing" feel
                    await new Promise(r => setTimeout(r, 1500));
                }

                // Deliver Final Content
                updateMessage(thinkingId, {
                    content: demoIntercept.content,
                    thinking: {
                        isThinking: false,
                        steps: demoIntercept.steps ? demoIntercept.steps.map(s => ({...s, status: 'completed'})) : [],
                        plan: []
                    }
                });
                setIsProcessing(false);
                focusInput(); // Refocus input after preset demo
                setStreamingMessageId(thinkingId);
            }, 800); // Slight initial delay for realism

            return; // EXIT EARLY - Do not hit backend
        }

        const userMsgId = `user-${Date.now()}`;
        addMessage({
            id: userMsgId,
            type: 'user',
            content: displayContent,
            timestamp: new Date(),
        });

        setInput('');
        setAttachments([]);
        setIsProcessing(true);

        const thinkingId = `thinking-${Date.now()}`;
        addMessage({
            id: thinkingId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            thinking: { isThinking: true, steps: [], plan: [] }
        });

        // Clear any previous streaming state
        setStreamingMessageId(null);

        // Helper for simulated steps
        const simulateDemoSteps = async (msgId: string, currentPersona: string) => {
            // DETECT URL INTENT: If input is a URL, switch to Discovery Mode
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const hasUrl = userInput.match(urlRegex);

            if (hasUrl) {
                // DISCOVERY MODE: Trigger Scout Simulation
                const url = hasUrl[0];
                const stepsSequence = [
                   { name: 'Discovery Intake', desc: `Ingesting public data from ${new URL(url).hostname}...` },
                   { name: 'Ezal Market Scout', desc: 'Analyzing local competitors and pricing...' },
                   { name: 'Deebo Compliance', desc: 'Scanning metadata for risk factors...' },
                   { name: 'Smokey Menu Sync', desc: 'Learning product inventory...' },
                   { name: 'Generating Brief', desc: 'Compiling Digital Worker Report...' }
                ];

                let currentSteps: ToolCallStep[] = [];
                for (const step of stepsSequence) {
                    const currentMsg = useAgentChatStore.getState().currentMessages.find(m => m.id === msgId);
                    if (!currentMsg || !currentMsg.thinking?.isThinking) break;

                    const stepId = Math.random().toString(36).substr(2, 9);
                    const newStep: ToolCallStep = {
                        id: stepId,
                        toolName: step.name,
                        description: step.desc,
                        status: 'in-progress',
                        durationMs: 0
                    };
                    currentSteps.push(newStep);

                    updateMessage(msgId, {
                        thinking: {
                            isThinking: true,
                            steps: [...currentSteps],
                            plan: []
                        }
                    });

                    await new Promise(r => setTimeout(r, 1500)); // 1.5s per step for dramatic effect

                    // Mark complete
                    currentSteps = currentSteps.map(s => s.id === stepId ? { ...s, status: 'completed' } : s);
                     updateMessage(msgId, {
                        thinking: {
                            isThinking: true,
                            steps: [...currentSteps],
                            plan: []
                        }
                    });
                }
                
                // --- TRIGGER REAL AGENT JOB ---
                try {
                    // Only dispatch real job if not just visual demo
                    // We need to import the action first. Assuming dynamic import for now or adding to top.
                    // For this sprint, we'll use dynamic import to avoid breaking build if file not found yet.
                    if (!isAuthenticated) {
                        const { runPublicDiscoveryAgent } = await import('../agents/public-actions');
                        const result = await runPublicDiscoveryAgent(url, userInput);
                        if (result.success && result.jobId) {
                            setActiveJob({ jobId: result.jobId, messageId: msgId });
                            setIsProcessing(true);
                            // Visual simulation continues until real data overrides
                        }
                    } else {
                        // Authenticated User: Run Standard Agent
                        const { runAgentChat } = await import('../agents/actions');
                        const result = await runAgentChat(
                            `PERFORM DISCOVERY AUDIT ON: ${url}. ${userInput}`, 
                            'puff',
                            { projectId: 'discovery-audit' }
                        );
                         if (result.metadata?.jobId) {
                            setActiveJob({ jobId: result.metadata.jobId, messageId: msgId });
                            setIsProcessing(true);
                        }
                    }
                } catch (e) {
                    console.error('Failed to dispatch discovery agent:', e);
                }

                // Final Discovery Report Output
                return currentSteps;
            }

            // STANDARD DEMO MODE
            const stepsSequence = [
                { name: 'Analyzing Request', desc: 'Parsing intent and context...' },
                { name: 'Agent Routing', desc: `Routing task to ${currentPersona}...` },
                { name: 'Knowledge Lookup', desc: 'Searching database for matches...' },
                // Standard step, but will be dynamically replaced if creative intent detected
                { name: 'Formulating Response', desc: 'Generating final answer...' }
            ];

            // DETECT CREATIVE INTENT from userInput for better simulation steps
            const isImageGen = userInput.toLowerCase().includes('image') || userInput.toLowerCase().includes('photo') || userInput.toLowerCase().includes('generate');
            const isVideoGen = userInput.toLowerCase().includes('video');

            if (isImageGen || isVideoGen) {
                // Replace final step with creative specific one
                stepsSequence.pop(); 
                stepsSequence.push({ 
                    name: 'Creative Engine', 
                    desc: isVideoGen ? 'Generating your video...' : 'Generating your image...' 
                });
            }

            let currentSteps: ToolCallStep[] = [];

            for (const step of stepsSequence) {
                // Check if message is still in thinking mode
                const currentMsg = useAgentChatStore.getState().currentMessages.find(m => m.id === msgId);
                if (!currentMsg || !currentMsg.thinking?.isThinking) break;

                // Add new step as pending
                const stepId = Math.random().toString(36).substr(2, 9);
                const newStep: ToolCallStep = {
                    id: stepId,
                    toolName: step.name,
                    description: step.desc,
                    status: 'in-progress',
                    durationMs: 0
                };
                currentSteps.push(newStep);

                updateMessage(msgId, {
                    thinking: {
                        isThinking: true,
                        steps: [...currentSteps], // Create copy
                        plan: []
                    }
                });

                await new Promise(r => setTimeout(r, 800)); // Wait

                // Mark previous step complete
                currentSteps = currentSteps.map(s => s.id === stepId ? { ...s, status: 'completed' } : s);
                 updateMessage(msgId, {
                    thinking: {
                        isThinking: true,
                        steps: [...currentSteps],
                        plan: []
                    }
                });
            }
            return currentSteps;
        };

        try {
            const processedAttachments = await convertAttachments();
            
            let response: any; // Type: AgentResult

            // Public Demo Mode (Unauthenticated)
            if (!isAuthenticated) {
                // Return promise that resolves after animation sequence
                const simulationPromise = simulateDemoSteps(thinkingId, persona);

                // Call public API endpoint concurrently
                const fetchPromise = fetch('/api/demo/agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agent: persona, 
                        prompt: userInput,
                        context: {} 
                    })
                }).then(async res => {
                    if (!res.ok) throw new Error('Demo service unavailable');
                    return res.json();
                });

                // Wait for BOTH to finish. This ensures users see the "episodic thinking" animation
                // even if the API is fast.
                const [simulationSteps, data] = await Promise.all([simulationPromise, fetchPromise]);
                
                // Map API response to AgentResult format
                let content = '';
                
                // If items returned (standard demo response)
                if (data.items && data.items.length > 0) {
                     content = `Here is what I found for you:\n\n`;
                     data.items.forEach((item: any) => {
                         content += `### ${item.title}\n${item.description}\n\n`;
                         if (item.meta) content += `> *${item.meta}*\n\n`;
                     });
                } else {
                    content = "I couldn't find any specific results for that query in the demo database.";
                }

                // Construct AgentResult with preserved steps
                response = {
                    content: content,
                    toolCalls: simulationSteps.map(s => ({
                        id: s.id,
                        name: s.toolName,
                        result: s.description,
                        status: 'success'
                    })),
                    metadata: {
                        agentName: data.agent,
                        media: data.generatedMedia // { type, url }
                    }
                };

                // Typewriter effect trigger for demo
                setStreamingMessageId(thinkingId);
            
            } else {
                // Authenticated Mode (Server Action)
                // Run episodic thinking simulation concurrently with the server action
                const simulationPromise = simulateDemoSteps(thinkingId, persona);
                const serverPromise = runAgentChat(
                    userInput, 
                    persona, 
                    { 
                        modelLevel: thinkingLevel,
                        audioInput: audioBase64,
                        attachments: processedAttachments,
                        projectId: selectedProjectId || undefined // Pass project context
                    }
                );
                
                // Wait for server response (simulation continues in background)
                const [simulatedSteps, serverResponse] = await Promise.all([simulationPromise, serverPromise]);
                response = {
                    ...serverResponse,
                    // Merge simulated steps with any real tool calls
                    toolCalls: (serverResponse.toolCalls?.length ?? 0) > 0 
                        ? serverResponse.toolCalls 
                        : simulatedSteps.map(s => ({
                            id: s.id,
                            name: s.toolName,
                            result: s.description,
                            status: 'success'
                        }))
                };
            }

            // Handle Async Job Response (Async Mode - Auth Only)
            if (response.metadata?.jobId) {
                setActiveJob({ jobId: response.metadata.jobId, messageId: thinkingId });
                return; 
            }

            // Fallback for Synchronous response (if applicable, or legacy)
            const responseText = response.content.toLowerCase();

            let needsGmail = false;
            let needsSchedule = false;

            if (toolMode === 'auto') {
                needsGmail = responseText.includes('email') || responseText.includes('gmail') || userInput.toLowerCase().includes('email');
                needsSchedule = responseText.includes('daily') || responseText.includes('schedule') || userInput.toLowerCase().includes('daily');
            } else {
                needsGmail = selectedTools.includes('gmail');
                needsSchedule = selectedTools.includes('calendar');
            }

            const newPermissions: ToolPermission[] = [];
            const newTriggers: PuffTrigger[] = [];

            if (needsGmail) {
                newPermissions.push({
                    id: 'gmail',
                    name: 'Gmail',
                    icon: 'mail',
                    email: user?.email || 'unknown@user.com',
                    description: 'Integration with Gmail',
                    status: 'pending',
                    tools: ['Send Message'],
                });
            }

            if (needsSchedule) newTriggers.push({ id: 'schedule-1', type: 'schedule', label: 'Daily at 9:00 AM' });

            setState(prev => ({
                ...prev,
                permissions: [...prev.permissions, ...newPermissions],
                triggers: [...prev.triggers, ...newTriggers],
            }));
            if (newPermissions.length > 0) setShowPermissions(true);

            // Set streaming for typewriter effect
            setStreamingMessageId(thinkingId);
            
            updateMessage(thinkingId, {
                content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content, null, 2),
                metadata: {
                    ...response.metadata,
                    media: response.metadata?.media || response.toolCalls?.map((tc: any) => {
                        try {
                            const resultData = typeof tc.result === 'string' && (tc.result.startsWith('{') || tc.result.includes('"url"')) 
                                ? JSON.parse(tc.result) 
                                : tc.result;
                            return extractMediaFromToolResponse(resultData);
                        } catch (e) { return null; }
                    }).find((m: any) => m !== null)
                },
                thinking: {
                    isThinking: false,
                    steps: response.toolCalls?.map((tc: any) => ({
                        id: tc.id,
                        toolName: tc.name,
                        description: typeof tc.result === 'object' ? JSON.stringify(tc.result) : String(tc.result || ''),
                        status: tc.status === 'success' ? 'completed' : tc.status === 'error' ? 'failed' : 'pending',
                        durationMs: 0
                    })) || [],
                    plan: []
                }
            });

        } catch (error: any) {
            console.error(error);
            updateMessage(thinkingId, {
                content: `I ran into an issue. Please try again. ${error.message}`,
                thinking: { isThinking: false, steps: [], plan: [] }
            });
            setIsProcessing(false);
            focusInput(); // Refocus input after error
        }

        setIsProcessing(false);
        focusInput(); // Refocus input after successful response

        if (onSubmit) {
            await onSubmit(userInput);
        }
    };

    const handleSubmit = () => submitMessage(input);

    const handleGrantPermission = async (permissionId: string) => {
        const permission = state.permissions.find(p => p.id === permissionId);

        if (['gmail', 'calendar', 'sheets', 'drive'].includes(permission?.id || '')) {
            try {
                // permission.id matches the service name expected by getGoogleAuthUrl
                const url = await getGoogleAuthUrl(permission?.id as any);
                if (url) {
                    window.location.href = url;
                }
            } catch (error) {
                console.error("Failed to get auth URL:", error);
            }
            return;
        }

        setState(prev => ({
            ...prev,
            permissions: prev.permissions.map(p =>
                p.id === permissionId ? { ...p, status: 'granted' } : p
            ),
        }));
    };

    const handleStop = async () => {
        if (activeJob) {
            await cancelAgentJob(activeJob.jobId);
            setActiveJob(null);
        }
        setIsProcessing(false);
    };

    const hasMessages = displayMessages.length > 0;

    const InputArea = (
        <div className={cn("p-2 border-t", hideHeader && "border-0")}>
            {/* Attachment Previews */}
            {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                    {attachments.map(att => (
                        <div key={att.id} className="relative group shrink-0">
                            <div className="border rounded-lg overflow-hidden w-16 h-16 flex items-center justify-center bg-muted">
                                {att.type === 'image' ? (
                                    <img src={att.preview} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                    <FileText className="w-8 h-8 text-muted-foreground" />
                                )}
                            </div>
                            <button 
                                onClick={() => removeAttachment(att.id)}
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className={cn("mx-auto bg-muted/20 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all p-2 space-y-2 shadow-inner", hideHeader ? "w-full" : "max-w-3xl")}>
            {/* Suggestions removed from InputArea - moved to Empty State */}
                
                <div className="flex gap-2">
                     <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={hasMessages ? "Reply, or use microphone..." : "Ask Smokey anything..."}
                        className="min-h-[44px] max-h-[200px] w-full border-0 bg-transparent resize-none p-0 focus:outline-none focus:ring-0 shadow-none text-base flex-1 overflow-y-auto"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        rows={1}
                    />
                </div>


                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => fileInputRef.current?.click()}>
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            multiple 
                            onChange={handleFileSelect}
                        />
                         
                         {/* Separator / Divider */}
                        <div className="h-4 w-[1px] bg-border mx-1" />

                        <div className="flex items-center gap-1">
                            <PersonaSelector value={persona} onChange={setPersona} isSuperUser={isSuperUser} isAuthenticated={isAuthenticated} />
                            <ModelSelector 
                                value={thinkingLevel} 
                                onChange={setThinkingLevel} 
                                userPlan="pro" 
                                unlockResearch={true} 
                                isSuperUser={isSuperUser}
                            />
                            <ToolSelector
                                mode={toolMode}
                                selectedTools={selectedTools}
                                onModeChange={setToolMode}
                                onToggleTool={handleToggleTool}
                            />
                            {isAuthenticated && (
                                <ProjectSelector
                                    value={selectedProjectId}
                                    onChange={setSelectedProjectId}
                                />
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <AudioRecorder 
                            onRecordingComplete={handleAudioComplete} 
                            isProcessing={false} // Managed by button loading state typically
                        />
                        {isProcessing ? (
                            <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8 rounded-full transition-all animate-in fade-in zoom-in"
                                onClick={handleStop}
                                title="Stop Generation"
                            >
                                <div className="h-3 w-3 bg-white rounded-[2px]" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                className={cn("h-8 w-8 rounded-full transition-all", input.trim() || attachments.length > 0 ? "bg-primary" : "bg-muted text-muted-foreground")}
                                disabled={(!input.trim() && attachments.length === 0)}
                                onClick={handleSubmit}
                                data-testid="submit-button"
                            >
                                <Sparkles className="h-4 w-4" />
                            </Button>

                        )}
                    </div>


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
    );;

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
             {/* Hire Modal */}
             <HireAgentModal 
                isOpen={isHireModalOpen} 
                onClose={() => setIsHireModalOpen(false)} 
                planId={selectedHirePlan}
             />

            {/* Header */}
            {!hideHeader && (
                <div className="flex-none border-b p-3 flex items-center justify-between gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-2">
                             {onBack && <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1 md:hidden" onClick={onBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>}
                            <span className="font-semibold text-sm truncate">{state.title}</span>
                        </div>
                        
                        {/* HIRE BUTTON for Demo/Scout Users */}
                         {!isAuthenticated && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="bg-gradient-to-r from-emerald-500 to-green-600 border-0 hover:opacity-90 ml-2"
                                onClick={() => openHireModal('specialist')}
                            >
                                Hire Agent
                            </Button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <PersonaSelector 
                            value={persona} 
                            onChange={setPersona} 
                            isSuperUser={isSuperUser} 
                            isAuthenticated={isAuthenticated} 
                        />
                        
                        {/* Intelligence Selector */}
                        <ModelSelector 
                            value={thinkingLevel} 
                            onChange={setThinkingLevel}
                        />

                        {/* Tool Selector */}
                        <ToolSelector 
                            mode={toolMode}
                            selectedTools={selectedTools}
                            onModeChange={setToolMode}
                            onToggleTool={handleToggleTool}
                        />
                    </div>
                </div>
            )}
            <div className="flex flex-1 min-h-0 relative">
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    {/* Content Area - Auto-expands with content */}
                    <div 
                        ref={scrollAreaRef}
                        className="flex-1 w-full bg-slate-50/30 overflow-y-auto min-h-0"
                    >
                <div className="p-4 space-y-4 min-h-full pb-8">
                    {/* Empty State */}
                    {!hasMessages && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                            <div className="bg-white p-4 rounded-full shadow-sm ring-1 ring-slate-100">
                                <Sparkles className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-semibold tracking-tight">Meet Your Digital Workforce</h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    Give me a URL and I'll put my team to work—no login needed.
                                </p>
                            </div>
                            
                            {promptSuggestions.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full px-4 pt-4">
                                    {promptSuggestions.map((suggestion, i) => (
                                        <Button
                                            key={i}
                                            variant="outline"
                                            className="h-auto py-3 px-4 text-xs justify-start text-left whitespace-normal bg-white hover:bg-slate-50 border-slate-200 hover:border-primary/30 transition-all shadow-sm"
                                            onClick={() => submitMessage(suggestion)}
                                        >
                                            {suggestion}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Messages */}
                    {hasMessages && displayMessages.map(message => (
                        <div key={message.id}>
                            {message.role === 'user' ? (
                                <div className="flex justify-end group items-start gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mt-2"
                                        onClick={() => navigator.clipboard.writeText(message.content)}
                                        title="Copy prompt"
                                    >
                                        <Copy className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%] shadow-sm">
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 max-w-[90%]">
                                    {/* Compact Discovery Summary - for past completed messages */}
                                    {message.steps && message.steps.length > 0 && !message.isThinking && (
                                        <DiscoverySummary 
                                            steps={message.steps.map((s: ToolCallStep) => ({
                                                id: s.id,
                                                agentId: s.subagentId || 'puff',
                                                agentName: s.toolName.split(':')[0] || 'Puff',
                                                action: s.description || s.toolName,
                                                status: s.status === 'completed' ? 'done' : (s.status === 'in-progress' ? 'running' : s.status as any),
                                                durationMs: s.durationMs
                                            }))}
                                            durationSec={Math.round((message.steps.reduce((sum: number, s: ToolCallStep) => sum + (s.durationMs || 0), 0)) / 1000)}
                                        />
                                    )}


                                    {/* CREATIVE LOADER - Shows when "Creative Engine" step is active */}
                                    {message.isThinking && message.steps && message.steps.some(s => s.toolName === 'Creative Engine' && s.status === 'in-progress') && (
                                        <CreativeLoader 
                                            label={message.steps.find(s => s.toolName === 'Creative Engine')?.description || 'Generating...'} 
                                        />
                                    )}

                                    {/* THINKING WINDOW - Shows for heavy "Agentic" tasks (Scraping, Recon, Search) */}
                                    {message.isThinking && message.steps && message.steps.length > 0 && !message.steps.some(s => s.toolName === 'Creative Engine') && (
                                        <ThinkingWindow 
                                            steps={message.steps} 
                                            isThinking={true} 
                                            agentName={message.metadata?.agentName || (message.steps[0].subagentId || 'smokey')} 
                                        />
                                    )}
                                    
                                    {/* Fallback Thinking Indicator if no steps but still thinking */}
                                    {message.isThinking && (!message.steps || message.steps.length === 0) && (
                                        <ThinkingIndicator duration={message.workDuration} />
                                    )}

                                    {/* Content - Only show when not thinking (or handling streaming transition) */}
                                    {!message.isThinking && (
                                        <div className="bg-white rounded-2xl rounded-tl-sm border px-6 py-5 shadow-sm">
                                            {/* Rich Metadata Rendering */}
                                            {message.metadata?.type === 'compliance_report' && (
                                                <Card className="border-red-200 bg-red-50 mb-4">
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

                                            {/* Media Preview (Video/Image) */}
                                            {message.metadata?.media && (
                                                <div className="mb-4">
                                                    <ChatMediaPreview
                                                        type={message.metadata.media.type}
                                                        url={message.metadata.media.url}
                                                        prompt={message.metadata.media.prompt}
                                                        duration={message.metadata.media.duration}
                                                        model={message.metadata.media.model}
                                                    />
                                                </div>
                                            )}

                                            {message.metadata?.type === 'product_rec' && (
                                                <Card className="border-emerald-200 bg-emerald-50 mb-4">
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

                                            <div className="prose prose-sm max-w-none group relative text-sm leading-relaxed space-y-2">
                                                    {/* Viewport-aware Layout: Typewriter for Desktop, Carousel for Mobile */}
                                                    {(() => {
                                                        const contentStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2);
                                                        const isStreaming = streamingMessageId === message.id;
                                                        const isLongStructured = contentStr.length > 300 && (contentStr.includes('## ') || contentStr.includes('### '));
                                                        
                                                        // MOBILE: Carousel for structured content, instant markdown otherwise
                                                        if (isMobile) {
                                                            if (isLongStructured) {
                                                                return (
                                                                    <div className="w-full -mx-4 sm:mx-0 px-4 sm:px-0">
                                                                        <AgentResponseCarousel content={contentStr} />
                                                                    </div>
                                                                );
                                                            }
                                                            return (
                                                                <ReactMarkdown 
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        p: ({node, ...props}) => <div {...props} />,
                                                                        ul: ({node, ...props}) => <ul className="list-disc list-inside my-2" {...props} />,
                                                                        ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2" {...props} />,
                                                                        li: ({node, ...props}) => <li className="my-1" {...props} />,
                                                                        h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                                                        h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                                                                        h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                                                                        blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/50 pl-4 italic my-2" {...props} />,
                                                                        code: ({node, inline, className, children, ...props}: any) => {
                                                                            const match = /language-(\w+)/.exec(className || '');
                                                                            if (!inline && match) {
                                                                                return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} className="my-4" />;
                                                                            }
                                                                            return <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
                                                                        },
                                                                    }}
                                                                >
                                                                    {contentStr}
                                                                </ReactMarkdown>
                                                            );
                                                        }
                                                        
                                                        // DESKTOP/TABLET: Typewriter effect when streaming
                                                        if (isStreaming) {
                                                            return (
                                                                <TypewriterText 
                                                                    text={contentStr}
                                                                    speed={15}
                                                                    delay={500}
                                                                    onComplete={() => setStreamingMessageId(null)}
                                                                    className="whitespace-pre-wrap"
                                                                />
                                                            );
                                                        }
                                                        
                                                        // DESKTOP/TABLET: Collapsible content for very long responses
                                                        if (contentStr.length > 2500) {
                                                            return <CollapsibleContent content={contentStr} />;
                                                        }
                                                        
                                                        // DESKTOP: Standard markdown for normal length content
                                                        return (
                                                            <ReactMarkdown 
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    p: ({node, ...props}) => <div {...props} />,
                                                                    ul: ({node, ...props}) => <ul className="list-disc list-inside my-2" {...props} />,
                                                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2" {...props} />,
                                                                    li: ({node, ...props}) => <li className="my-1" {...props} />,
                                                                    h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                                                    h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                                                                    h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                                                                    blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/50 pl-4 italic my-2" {...props} />,
                                                                    a: ({node, href, children, ...props}: any) => {
                                                                        if (href?.startsWith('artifact://')) {
                                                                            const artifactId = href.replace('artifact://', '');
                                                                            return (
                                                                                <Button 
                                                                                    variant="outline" 
                                                                                    className="my-2 gap-2 h-auto py-2 px-3 bg-white hover:bg-slate-50 border-emerald-200 text-emerald-800 w-full justify-start"
                                                                                    onClick={(e) => {
                                                                                        e.preventDefault();
                                                                                        setActiveArtifact(artifactId);
                                                                                        setArtifactPanelOpen(true);
                                                                                    }}
                                                                                >
                                                                                    <div className="bg-emerald-100 p-1.5 rounded-md">
                                                                                        <FileText className="h-4 w-4 text-emerald-600" />
                                                                                    </div>
                                                                                    <div className="flex flex-col items-start text-xs">
                                                                                        <span className="font-semibold">{children}</span>
                                                                                        <span className="text-emerald-600/80">Click to open artifact</span>
                                                                                    </div>
                                                                                </Button>
                                                                            );
                                                                        }
                                                                        return <a href={href} className="text-primary underline underline-offset-4" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                                                                    },
                                                                    code: ({node, inline, className, children, ...props}: any) => {
                                                                        const match = /language-(\w+)/.exec(className || '');
                                                                        if (!inline && match) {
                                                                            return (
                                                                                <CodeBlock 
                                                                                    language={match[1]} 
                                                                                    value={String(children).replace(/\n$/, '')} 
                                                                                    className="my-4"
                                                                                />
                                                                            );
                                                                        }
                                                                        return (
                                                                            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                                                                                {children}
                                                                            </code>
                                                                        );
                                                                    },
                                                                }}
                                                            >
                                                                {contentStr}
                                                            </ReactMarkdown>
                                                        );
                                                    })()}
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(message.content);
                                                        const btn = document.getElementById(`copy-btn-${message.id}`);
                                                        if (btn) {
                                                            btn.classList.add('text-emerald-500');
                                                            setTimeout(() => btn.classList.remove('text-emerald-500'), 1500);
                                                        }
                                                    }}
                                                    id={`copy-btn-${message.id}`}
                                                    className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
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
                    
                    {/* Spacer for bottom input */}
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            {/* Input at BOTTOM */}
            <div className="shrink-0 z-20 bg-background border-t pt-2 space-y-2 min-h-[60px] sticky bottom-0">
                {/* Unified Discovery Bar - Removed per user request to reduce clutter */}
                {/* {showDiscoveryBar && (
                    <div className="px-4">
                        <DiscoveryBar 
                            isActive={isDiscoveryActive}
                            steps={discoverySteps}
                            isFirstDiscovery={isFirstDiscovery}
                            onClose={() => setShowDiscoveryBar(false)}
                        />
                    </div>
                )} */}
                {InputArea}
            </div>
          </div>

            {/* Artifact Panel */}
            <ArtifactPanel 
                artifacts={currentArtifacts}
                selectedArtifact={currentArtifacts.find(a => a.id === activeArtifactId) || null}
                isOpen={isArtifactPanelOpen}
                onSelect={(a) => setActiveArtifact(a?.id || null)}
                onClose={() => setArtifactPanelOpen(false)}
                onShare={(a) => console.log('Share', a)}
            />
        </div>
    </div>
    );
}

// --- Helper Components ---

function StepsList({ steps }: { steps: ToolCallStep[] }) {
    if (!steps || steps.length === 0) return null;

    return (
        <div className="space-y-2 mt-2 text-xs">
            {steps.map((step, i) => (
                <div key={i} className="border rounded p-2 bg-muted/50">
                    <div className="flex items-center gap-2 font-medium">
                        {step.status === 'in-progress' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                        {step.status === 'completed' && <Check className="h-3 w-3 text-green-500" />}
                        {step.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
                        <span className="font-mono text-xs">{step.toolName || 'tool'}</span>
                    </div>
                    {/* step.args does not exist on ToolCallStep in this file, description does */}
                    <div className="ml-5 text-[10px] text-muted-foreground">{step.description}</div>
                </div>
            ))}
        </div>
    );
}

function CreativeLoader({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-dashed border-primary/30 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="relative">
                {/* Spinning Ring */}
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div className="absolute -inset-1 rounded-full border border-purple-200 animate-pulse" />
                
                {/* Smokey Icon Center */}
                <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-purple-100 flex items-center justify-center overflow-hidden p-1">
                     <img 
                        src="/assets/agents/smokey-main.png" 
                        alt="Smokey" 
                        className="h-full w-full object-contain animate-bounce" 
                        style={{ animationDuration: '2s' }}
                    />
                </div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    {label}
                </span>
                <span className="text-[10px] text-muted-foreground">This may take a few seconds</span>
            </div>
        </div>
    );
}

function ThinkingIndicator({ level = 'balanced', duration }: { level?: 'fast' | 'balanced' | 'deep'; duration?: number }) {
    const labels = {
        fast: 'Thinking fast...',
        balanced: 'Reasoning...',
        deep: 'Deep thinking...'
    };

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground italic p-2">
            <Sparkles className="h-3 w-3 animate-pulse text-purple-400" />
            <span>{labels[level]} {duration ? `(${duration}ms)` : ''}</span>
        </div>
    );
}

// Collapsible content for very long desktop responses with "Show more" button
function CollapsibleContent({ content, initialChars = 1500 }: { content: string; initialChars?: number }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const needsExpansion = content.length > initialChars;
    
    // Find a good break point (end of a paragraph or sentence)
    const findBreakPoint = (text: string, targetLength: number): number => {
        const paragraphBreak = text.lastIndexOf('\n\n', targetLength);
        if (paragraphBreak > targetLength * 0.8) return paragraphBreak;
        const sentenceBreak = text.lastIndexOf('. ', targetLength);
        if (sentenceBreak > targetLength * 0.8) return sentenceBreak + 1;
        return targetLength;
    };
    
    const breakPoint = findBreakPoint(content, initialChars);
    const displayContent = isExpanded || !needsExpansion 
        ? content 
        : content.slice(0, breakPoint);
    
    return (
        <div>
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({node, ...props}) => <div {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside my-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2" {...props} />,
                    li: ({node, ...props}) => <li className="my-1" {...props} />,
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/50 pl-4 italic my-2" {...props} />,
                    code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        if (!inline && match) {
                            return <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} className="my-4" />;
                        }
                        return <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
                    },
                }}
            >
                {displayContent}
            </ReactMarkdown>
            
            {needsExpansion && !isExpanded && (
                <div className="mt-3 pt-3 border-t border-dashed">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsExpanded(true)}
                        className="text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                        <ChevronDown className="h-3 w-3" />
                        Show more ({Math.round((content.length - breakPoint) / 100) * 100}+ chars remaining)
                    </Button>
                </div>
            )}
            
            {isExpanded && needsExpansion && (
                <div className="mt-3 pt-3 border-t border-dashed">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsExpanded(false)}
                        className="text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                        <ChevronUp className="h-3 w-3" />
                        Show less
                    </Button>
                </div>
            )}
        </div>
    );
}

