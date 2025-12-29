'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatMediaPreview, extractMediaFromToolResponse } from '@/components/chat/chat-media-preview';
import { useSearchParams } from 'next/navigation';
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
    Briefcase,
    ShoppingCart,
    Search,
    ShieldCheck,
    Wrench,
    Settings,
    Copy,
    CheckCircle,
    Paperclip,
    X,
    FileText,
    Image as ImageIcon,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { runAgentChat, cancelAgentJob } from '../../ceo/agents/actions';
import { AgentPersona } from '../../ceo/agents/personas';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/firebase/auth/use-user';
import { AudioRecorder } from '@/components/ui/audio-recorder';
import { ModelSelector, ThinkingLevel } from '../../ceo/components/model-selector';
import { useJobPoller } from '@/hooks/use-job-poller';
import { ProjectSelector } from '@/components/dashboard/project-selector';
import type { Project } from '@/types/project';
import { AttachmentPreviewList, AttachmentItem } from '@/components/ui/attachment-preview';
import { ArtifactPanel, ArtifactCard } from '@/components/artifacts';
import { Artifact, parseArtifactsFromContent, createArtifactId } from '@/types/artifact';
import { shareArtifact } from '@/server/actions/artifacts';

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
    type: 'code' | 'image' | 'video' | 'file' | 'yaml' | 'json';
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

// ModelSelector is now imported


// ... (PersonaSelector and ToolSelector omitted as they assume no changes, keeping surrounding code) - wait I need to keep them or I overwrite if I replaced huge chunk.
// Actually, to precise edit, I will replace ModelSelector definition first, then Update AgentChat Component separately.
// This block targetted ModelSelector definition range.

function PersonaSelector({ value, onChange }: { value: AgentPersona, onChange: (v: AgentPersona) => void }) {
    const options: Record<AgentPersona, { label: string, desc: string, icon: any }> = {
        puff: { label: 'Puff', desc: 'General Assistant', icon: Sparkles },
        wholesale_analyst: { label: 'Wholesale', desc: 'LeafLink & Inventory', icon: Briefcase },
        menu_watchdog: { label: 'Watchdog', desc: 'Menu Monitoring', icon: ShoppingCart },
        sales_scout: { label: 'Scout', desc: 'Lead Generation', icon: Search },
        ezal: { label: 'Ezal', desc: 'Market Intelligence', icon: Zap },
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
    // ... existing implementation ...
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

// ... ConnectionIcon, PermissionCard, TriggerIndicator, ThinkingIndicator, StepsList ...
// I will keep the rest of the file and only replace main component logic in next chunk if needed.
// IMPORTANT: I am replacing ModelSelector, PersonaSelector, ToolSelector to keep file clean.

// ... (Keeping ConnectionIcon and others)

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

// Page context for brand/dispensary pages
export interface PageContext {
    type: 'brand' | 'dispensary' | 'local';
    slug: string;
    name?: string;
    isOwner?: boolean; // True if logged in as page owner
}

export interface AgentChatProps {
    initialTitle?: string;
    initialInput?: string;
    onBack?: () => void;
    onSubmit?: (message: string) => Promise<void>;
    // Context-aware props for brand/dispensary pages
    pageContext?: PageContext;
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
    initialInput = '',
    onBack,
    onSubmit,
    pageContext
}: AgentChatProps) {
    // Global Store State
    const { 
        currentMessages, 
        addMessage, 
        updateMessage, 
        setCurrentRole, 
        currentProjectId, 
        setCurrentProject,
        currentArtifacts,
        addArtifact 
    } = useAgentChatStore();
    const { role } = useUserRole();
    const { user } = useUser(); // Get authenticated user
    
    // Project context state
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    
    // Artifact panel state
    const [showArtifactPanel, setShowArtifactPanel] = useState(false);
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

    // Ensure store knows current role
    useEffect(() => {
        if (role) setCurrentRole(role);
    }, [role, setCurrentRole]);

    // Update input when initialInput changes
    useEffect(() => {
        if (initialInput) {
            setInput(initialInput);
        }
    }, [initialInput]);

    const [state, setState] = useState<PuffState>({
        title: initialTitle,
        isConnected: true,
        permissions: [],
        triggers: [],
    });

    // Fix hydration mismatch
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [showTriggers, setShowTriggers] = useState(false);
    const [showPermissions, setShowPermissions] = useState(true);
    const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('standard');
    const [persona, setPersona] = useState<AgentPersona>('puff');

    // Async Job Polling (Added for Stop Button support)
    const [activeJob, setActiveJob] = useState<{ jobId: string, messageId: string } | null>(null);
    const { job, thoughts, isComplete, error: jobError } = useJobPoller(activeJob?.jobId);

    // Sync Async Job to UI Store
    useEffect(() => {
        if (!activeJob) return;

        // 1. Update Thinking Steps from Thoughts
        if (thoughts.length > 0) {
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
            const content = result.content || '**Task Completed** (No content returned)';
            
            // Parse artifacts from agent response
            const { artifacts: parsedArtifacts, cleanedContent } = parseArtifactsFromContent(content);
            
            // Add any parsed artifacts to the store
            parsedArtifacts.forEach(a => {
                const fullArtifact: Artifact = {
                    id: a.id || createArtifactId(),
                    type: a.type!,
                    title: a.title!,
                    content: a.content!,
                    language: a.language,
                    metadata: a.metadata,
                    createdAt: a.createdAt || new Date(),
                    updatedAt: a.updatedAt || new Date(),
                };
                addArtifact(fullArtifact);
            });
            
            // If we found artifacts, open the panel
            if (parsedArtifacts.length > 0) {
                setShowArtifactPanel(true);
            }
            
            updateMessage(activeJob.messageId, {
                content: parsedArtifacts.length > 0 ? cleanedContent : content,
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
            setIsTranscribing(false);
        }

        // 3. Handle Failure
        if (job?.status === 'failed') {
             updateMessage(activeJob.messageId, {
                content: `**Task Failed**: ${job.error || 'Unknown error'}`,
                thinking: { isThinking: false, steps: [], plan: [] }
            });
            setActiveJob(null);
            setIsProcessing(false);
            setIsTranscribing(false);
        }

        // 4. Handle Polling Error (e.g. Permissions)
        if (jobError) {
             updateMessage(activeJob.messageId, {
                content: `**System Error**: ${jobError}. (Please verify Firestore Rules or Network)`,
                thinking: { isThinking: false, steps: [], plan: [] }
            });
            setActiveJob(null);
            setIsProcessing(false);
            setIsTranscribing(false);
        }
    }, [job, thoughts, isComplete, activeJob, updateMessage, jobError]);

    // Tool Selection State
    const [toolMode, setToolMode] = useState<ToolMode>('auto');
    const [selectedTools, setSelectedTools] = useState<AvailableTool[]>([]);

    // Multi-modal State
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    // Detect large pasted content and convert to attachment card (Claude-style)
    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        const pastedFiles = Array.from(e.clipboardData.files || []);
        
        // Handle pasted files (images, PDFs, etc.)
        if (pastedFiles.length > 0) {
            e.preventDefault();
            const newAttachments = pastedFiles.map(file => ({
                id: Math.random().toString(36).substr(2, 9),
                file,
                type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
                preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                name: file.name
            }));
            setAttachments(prev => [...prev, ...newAttachments]);
            return;
        }
        
        // For large text content (> 200 chars), convert to attachment card
        if (pastedText && pastedText.length > 200) {
            e.preventDefault();
            const attachment: AttachmentItem = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'pasted',
                content: pastedText,
                name: detectPastedContentName(pastedText)
            };
            setAttachments(prev => [...prev, attachment]);
        }
    };

    // Detect content type from pasted text
    const detectPastedContentName = (text: string): string => {
        const trimmed = text.trim();
        
        // Check for CSV format
        if (trimmed.includes(',') && trimmed.split('\n').length > 1) {
            const lines = trimmed.split('\n');
            const avgCommas = lines.slice(0, 5).map(l => (l.match(/,/g) || []).length);
            if (avgCommas.length > 0 && avgCommas.every(c => c > 0 && c === avgCommas[0])) {
                return 'Pasted CSV Data';
            }
        }
        
        // Check for JSON
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                JSON.parse(trimmed);
                return 'Pasted JSON Data';
            } catch { /* not valid JSON */ }
        }
        
        // Check for code-like content
        if (trimmed.includes('function ') || trimmed.includes('const ') || 
            trimmed.includes('import ') || trimmed.includes('class ')) {
            return 'Pasted Code';
        }
        
        // Check for markdown
        if (trimmed.includes('# ') || trimmed.includes('## ') || trimmed.includes('```')) {
            return 'Pasted Markdown';
        }
        
        return 'Pasted Content';
    };

    const handleAudioComplete = async (audioBlob: Blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
             const base64Audio = reader.result as string; 
             submitMessage('', base64Audio);
        };
    };

    const convertAttachments = async () => {
        return Promise.all(attachments.map(async (a) => {
            // Handle pasted text content
            if (a.type === 'pasted' && a.content) {
                return {
                    name: a.name || 'pasted-content.txt',
                    type: 'text/plain',
                    base64: `data:text/plain;base64,${btoa(a.content)}`
                };
            }
            
            // Handle file attachments
            if (!a.file) {
                return { name: 'unknown', type: 'unknown', base64: '' };
            }
            
            return new Promise<{ name: string, type: string, base64: string }>((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(a.file!);
                reader.onloadend = () => {
                    resolve({
                        name: a.file!.name,
                        type: a.file!.type,
                        base64: reader.result as string
                    });
                };
            });
        }));
    };

// ... (skip down to submitMessage)

    const submitMessage = useCallback(async (textInput: string, audioBase64?: string) => {
        if ((!textInput.trim() && !audioBase64 && attachments.length === 0) || isProcessing) return;

        const userInput = textInput;
        const displayContent = audioBase64 ? '🎤 Voice Message' : (userInput || (attachments.length > 0 ? `Sent ${attachments.length} attachment(s)` : ''));

        const userMsgId = `user-${Date.now()}`;
        addMessage({
            id: userMsgId,
            type: 'user',
            content: displayContent,
            timestamp: new Date()
        });

        setInput('');
        setAttachments([]);
        setIsProcessing(true);
        if (audioBase64) setIsTranscribing(true);

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
            const processedAttachments = await convertAttachments();

            // Call the real AI backend
            const response = await runAgentChat(
                userInput, 
                persona,
                { 
                    modelLevel: thinkingLevel,
                    audioInput: audioBase64,
                    attachments: processedAttachments 
                }
            );

            clearInterval(durationInterval);

            // Handle Async Job Response (Async Mode)
            if (response.metadata?.jobId) {
                setActiveJob({ jobId: response.metadata.jobId, messageId: thinkingId });
                // We rely on useJobPoller (if used) or just wait for user to stop.
                // Note: AgentChat currently relies on 'updateMessage' from polling in separate hook? 
                // Checks: This file uses 'useJobPoller'?
                // NO. It seems I didn't import useJobPoller here yet!
                // PuffChat has useJobPoller. AgentChat doesn't seem to have it?
                // Let's check imports.
                return;
            }

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
                metadata: {
                    ...response.metadata,
                    // Check for generated media in tool calls
                    media: response.toolCalls?.map(tc => {
                        // Attempt to extract media from result if it's an object or JSON string
                        try {
                            const resultData = typeof tc.result === 'string' && (tc.result.startsWith('{') || tc.result.includes('"url"')) 
                                ? JSON.parse(tc.result) 
                                : tc.result;
                            return extractMediaFromToolResponse(resultData);
                        } catch (e) { return null; }
                    }).find(m => m !== null)
                }, // Store rich metadata with media
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
        setIsTranscribing(false);

        if (onSubmit) {
            await onSubmit(userInput);
        }
    }, [input, isProcessing, onSubmit, addMessage, updateMessage, persona, toolMode, selectedTools, user, attachments, thinkingLevel, convertAttachments]);

    const handleSubmit = () => submitMessage(input);

    const handleGrantPermission = (permissionId: string) => {
        setState(prev => ({
            ...prev,
            permissions: prev.permissions.map(p =>
                p.id === permissionId ? { ...p, status: 'granted' } : p
            ),
        }));
    };

    if (!hasMounted) return null;

    if (!hasMounted) return null;

    // Use currentMessages from store converted to PuffMessage format for display
    const displayMessages: PuffMessage[] = currentMessages.map(m => ({
        id: m.id,
        role: m.type === 'agent' ? 'assistant' : 'user',
        content: m.content,
        timestamp: new Date(m.timestamp),
        isThinking: m.thinking?.isThinking,
        steps: m.thinking?.steps,
        metadata: m.metadata,
        workDuration: 0
    }));

    const handleStop = async () => {
        // Since AgentChat doesn't persist activeJob state explicitly in this file (it relies on store),
        // we might not have the jobId readily available unless we update state to track it.
        // However, looking at the code, it calls runAgentChat but doesn't store the result!
        // Wait, submitMessage DOES NOT store jobId in local state!
        // PuffChat does: setActiveJob(...)
        // AgentChat must be updated to track activeJob to support cancellation.
        // I will add activeJob state first.
        
        if (activeJob) {
            await cancelAgentJob(activeJob.jobId);
            setActiveJob(null);
        }
        setIsProcessing(false);
        setIsTranscribing(false);
    };

    const hasMessages = displayMessages.length > 0;

    // Input component (reusable for both positions)
    const InputArea = (
        <div className={cn("p-4", hasMessages ? "border-t" : "border-b")}>
             {/* Attachment Previews - Claude-style cards */}
             {attachments.length > 0 && (
                <div className="mb-3 max-w-3xl mx-auto">
                    <AttachmentPreviewList 
                        attachments={attachments} 
                        onRemove={removeAttachment} 
                    />
                </div>
            )}

            <div className="max-w-3xl mx-auto bg-muted/20 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all p-3 space-y-3 shadow-inner">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={hasMessages ? "Reply, or use microphone..." : "Ask Smokey anything..."}
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

                        {/* Separator */}
                        <div className="h-4 w-[1px] bg-border mx-1" />

                        <div className="border-l pl-2 flex items-center gap-1">
                            <PersonaSelector value={persona} onChange={setPersona} />
                            <ModelSelector 
                                value={thinkingLevel} 
                                onChange={setThinkingLevel} 
                                userPlan={(user as any)?.planId || 'free'}
                                isSuperUser={role === 'owner' || role === 'super_admin'}
                                unlockResearch={role === 'brand' || role === 'dispensary'}
                            />
                            <ToolSelector
                                mode={toolMode}
                                selectedTools={selectedTools}
                                onModeChange={setToolMode}
                                onToggleTool={handleToggleTool}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <AudioRecorder 
                            onRecordingComplete={handleAudioComplete} 
                            isProcessing={isTranscribing}
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
                            >
                                <Sparkles className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            {!hasMessages && (
                <div className="mt-3 space-y-2">
                    {/* Context-aware Quick Actions */}
                    {pageContext && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {pageContext.isOwner ? (
                                // Owner Quick Actions
                                <>
                                    <Button variant="outline" size="sm" onClick={() => submitMessage('Help me claim and verify this page')}>
                                        ✓ Claim This Page
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => submitMessage('How do I edit my page info?')}>
                                        ✏️ Edit Info
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => submitMessage('Show me my page analytics')}>
                                        📊 View Analytics
                                    </Button>
                                </>
                            ) : (
                                // Customer Quick Actions
                                <>
                                    <Button variant="outline" size="sm" onClick={() => submitMessage(`Set up a drop alert for ${pageContext.name || 'this brand'}`)}>
                                        🔔 Set Drop Alert
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => submitMessage(`I want to follow ${pageContext.name || 'this brand'}`)}>
                                        ❤️ Follow Brand
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => submitMessage('Find dispensaries near me that carry this brand')}>
                                        📍 Find Nearby
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                    <p className="text-center text-[10px] text-muted-foreground">AI can make mistakes. Verify critical automations.</p>
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
        <>
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
                        {/* Artifacts Toggle Button */}
                        {currentArtifacts.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowArtifactPanel(!showArtifactPanel)}
                                className="gap-1.5 bg-white"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span className="text-xs">{currentArtifacts.length}</span>
                            </Button>
                        )}
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

                                                <div className="prose prose-sm max-w-none text-sm leading-relaxed space-y-2">
                                                    <ReactMarkdown 
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: ({node, ...props}) => <div {...props} />, // Use div to avoid p nesting issues if markdown has blocks
                                                            ul: ({node, ...props}) => <ul className="list-disc list-inside my-2" {...props} />,
                                                            ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2" {...props} />,
                                                            li: ({node, ...props}) => <li className="my-1" {...props} />,
                                                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                                            h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                                                            h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                                                            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-primary/50 pl-4 italic my-2" {...props} />,
                                                            code: ({node, ...props}) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                                                        }}
                                                    >
                                                        {message.content}
                                                    </ReactMarkdown>
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

        {/* Artifact Panel */}
        <ArtifactPanel
            artifacts={currentArtifacts}
            selectedArtifact={selectedArtifact}
            onSelect={(artifact) => {
                setSelectedArtifact(artifact);
                if (artifact) setShowArtifactPanel(true);
            }}
            onClose={() => {
                setShowArtifactPanel(false);
                setSelectedArtifact(null);
            }}
            onShare={async (artifact) => {
                try {
                    const result = await shareArtifact(
                        artifact.id,
                        artifact.title,
                        artifact.content,
                        artifact.type,
                        artifact.metadata
                    );
                    if (result.success && result.shareUrl) {
                        // Copy share URL to clipboard
                        await navigator.clipboard.writeText(result.shareUrl);
                        alert(`Share link copied to clipboard:\n${result.shareUrl}`);
                    }
                } catch (error) {
                    console.error('Failed to share artifact:', error);
                }
            }}
            isOpen={showArtifactPanel}
        />
        </>
    );
}
