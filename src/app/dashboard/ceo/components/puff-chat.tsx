import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Send, Mic, Paperclip, X, Bot, Sparkles, AlertCircle, 
    MoreHorizontal, ArrowLeft, Loader2, Check, ExternalLink, 
    Copy, Image as ImageIcon, FileText, Play, Square, 
    ChevronDown, ChevronUp, Star, ShieldCheck, Mail, Calendar, 
    FolderOpen, Globe, LayoutGrid, Wrench, Menu, Leaf, 
    Megaphone, BarChart3, Zap, DollarSign, Heart, ShieldAlert, 
    Briefcase, Rocket, Sparkles as SparklesIcon, CheckCircle2, 
    ShoppingCart 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useIsMobile } from '@/hooks/use-mobile';

// Sub-components
import { ModelSelector, ThinkingLevel } from './model-selector';
import { ProjectSelector } from '@/components/chat/project-selector';
import { HireAgentModal } from '@/components/billing/hire-agent-modal';
import artifactPlugin from '@/lib/markdown/artifact-plugin';
import { ArtifactPanel } from '@/components/artifacts/artifact-panel';
import { AudioRecorder } from '@/components/ui/audio-recorder';
import { CodeBlock } from '@/components/ui/code-block';
import { ChatMediaPreview } from '@/components/chat/chat-media-preview';
import { AgentResponseCarousel } from '@/components/chat/agent-response-carousel'; // Mobile opt
import { TypewriterText } from '@/components/landing/typewriter-text'; // Desktop opt
import { usePuffChatLogic } from '../hooks/use-puff-chat-logic';
import { AgentPersona } from '../../agents/personas';
import { 
    ToolCallStep, ToolPermission, PuffTrigger, PuffState, ToolMode, AvailableTool
} from '../types/chat-types';
import { ThoughtBubble } from '@/components/chat/thought-bubble';
import { ChatFeedback } from '@/components/chat/chat-feedback';

// ============ Types (Local or Imported) ============
// Keeping PuffMessage here as it is a UI-specific mapping often used by children
export interface PuffMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isThinking?: boolean;
    workDuration?: number; // seconds
    steps?: ToolCallStep[];
    metadata?: {
        type?: 'compliance_report' | 'product_rec' | 'elasticity_analysis' | 'session_context' | 'hire_modal' | 'system_health' | 'permission_info';
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
        permission?: string;
        reason?: string;
    };
}


// ============ Sub-components Definitions ============

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
    onToggleTool,
    integrationStatus,
    onConnectTool,
    onShowToolInfo
}: {
    mode: ToolMode;
    selectedTools: AvailableTool[];
    onModeChange: (mode: ToolMode) => void;
    onToggleTool: (tool: AvailableTool) => void;
    integrationStatus?: Record<string, 'active' | 'disconnected' | 'error'>;
    onConnectTool?: (toolId: string) => void;
    onShowToolInfo?: (toolId: string) => void;
}) {
    const tools: { id: AvailableTool; label: string; icon: any; capability: string }[] = [
        { id: 'gmail', label: 'Gmail', icon: Mail, capability: 'Send & Read Emails' },
        { id: 'calendar', label: 'Calendar', icon: Calendar, capability: 'Manage Schedule' },
        { id: 'drive', label: 'Drive', icon: FolderOpen, capability: 'File Access' },
        { id: 'search', label: 'Web Search', icon: Globe, capability: 'Live Browsing' },
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
            <DropdownMenuContent align="start" className="w-[280px]">
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
                {tools.map(tool => {
                    // Determine status (default to active for 'search' as it's built-in)
                    const status = tool.id === 'search' ? 'active' : (integrationStatus?.[tool.id] || 'disconnected');
                    const isConnected = status === 'active';

                    return (
                    <div key={tool.id} className="relative flex items-center justify-between px-2 py-2 hover:bg-muted/50 rounded-sm group transition-colors">
                        {/* Main Row Area */}
                        <div 
                            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0" 
                            onClick={(e) => {
                                if (!isConnected && onConnectTool) {
                                    onConnectTool(tool.id);
                                } else {
                                    onToggleTool(tool.id);
                                }
                            }}
                        >
                            <div className={cn("shrink-0 h-2 w-2 rounded-full transition-all", isConnected ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]" : "bg-red-400 opacity-70")} />
                            <tool.icon className={cn("shrink-0 h-4 w-4", isConnected ? "text-foreground" : "text-muted-foreground")} />
                            <div className="flex flex-col min-w-0">
                                <span className={cn("text-sm font-medium truncate", !isConnected && "text-muted-foreground")}>{tool.label}</span>
                                <span className="text-[10px] text-muted-foreground truncate">{isConnected ? tool.capability : "Click to connect"}</span>
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                             {/* Info Button - Only if Connected */}
                             {isConnected && onShowToolInfo && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShowToolInfo(tool.id);
                                    }}
                                >
                                    <AlertCircle className="h-3 w-3" />
                                </Button>
                             )}

                             {/* Toggle Check - Only if Connected */}
                             {isConnected && (
                                <div onClick={(e) => { e.stopPropagation(); onToggleTool(tool.id); }} className="cursor-pointer">
                                     {selectedTools.includes(tool.id) && <Check className="h-3 w-3 text-primary ml-1" />}
                                </div>
                             )}
                        </div>
                    </div>
                )})}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}



// ... other helpers (PermissionCard, SystemHealthCheck, TriggerIndicator, ChatFeedback) ...
function PermissionCard({ permission, onGrant }: { permission: ToolPermission, onGrant: () => void }) {
    const isGranted = permission.status === 'granted';
    return (
        <div className="flex items-center justify-between p-3 first:border-0 border-t bg-white">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full bg-slate-100 ring-1 ring-slate-200", isGranted && "bg-emerald-100 ring-emerald-200")}>
                    {/* Render Icon based on string name if needed, assuming Lucide passed or mapped */}
                     <ShieldCheck className={cn("h-4 w-4 text-slate-500", isGranted && "text-emerald-600")} />
                </div>
                <div>
                    <h4 className="text-sm font-medium">{permission.name}</h4>
                    <p className="text-xs text-muted-foreground max-w-[200px]">{permission.description}</p>
                </div>
            </div>
            {isGranted ? (
                <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1">
                    <Check className="h-3 w-3" /> Active
                </Badge>
            ) : (
                <Button size="sm" variant="outline" onClick={onGrant} className="h-7 text-xs gap-1 border-primary/20 hover:bg-primary/5">
                    Connect <ExternalLink className="h-3 w-3" />
                </Button>
            )}
        </div>
    );
}

function SystemHealthCheck({ status, onConnect, onRefresh }: { status: any, onConnect: (id: string) => void, onRefresh: () => void }) {
    const services = [
        { id: 'gmail', label: 'Gmail', icon: Mail },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'drive', label: 'Drive', icon: FolderOpen },
        { id: 'sheets', label: 'Sheets', icon: LayoutGrid }, // Mock icon
    ];

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden mb-4">
            <div className="bg-slate-50 px-3 py-2 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-white p-1 rounded-md border shadow-sm">
                        <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">System Integrity Check</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh} title="Re-scan">
                    <Sparkles className="h-3 w-3 text-slate-400 hover:text-primary transition-colors" />
                </Button>
            </div>
            <div className="p-1">
                {services.map(s => {
                    const isConnected = status[s.id] === 'active';
                    return (
                        <div key={s.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors group">
                             <div className="flex items-center gap-2">
                                <s.icon className={cn("h-4 w-4", isConnected ? "text-slate-600" : "text-slate-400")} />
                                <span className={cn("text-sm", isConnected ? "text-slate-900" : "text-slate-500")}>{s.label}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", 
                                     isConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                                     {isConnected ? 'Active' : 'Offline'}
                                 </div>
                                 {!isConnected && (
                                     <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 text-[10px] text-primary hover:bg-primary/10 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => onConnect(s.id)}
                                     >
                                         Connect
                                     </Button>
                                 )}
                             </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}

function TriggerIndicator({ triggers, expanded, onToggle }: { triggers: PuffTrigger[], expanded: boolean, onToggle: () => void }) {
    return (
        <div className="mt-2 border rounded-lg overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
            <button onClick={onToggle} className="w-full flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                 <div className="flex items-center gap-2">
                     <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                     <span className="text-xs font-medium text-slate-700">Active Triggers</span>
                     <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-slate-200 text-slate-700">{triggers.length}</Badge>
                 </div>
                 {expanded ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
            </button>
            {expanded && (
                <div className="p-2 space-y-1 bg-white border-t">
                    {triggers.map(t => (
                        <div key={t.id} className="flex items-center gap-2 text-xs p-2 rounded-md bg-slate-50 border border-slate-100">
                             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="font-medium text-slate-700">{t.label}</span>
                             <span className="ml-auto text-slate-400 text-[10px] uppercase font-mono">{t.type}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export function PuffChat({ 
    initialTitle = 'New Automation', 
    onSubmit, 
    hideHeader = false, 
    onBack,
    className,
    isAuthenticated = true,
    isSuperUser = false,
    isHired = false, // Hired/Paid status
    persona: initialPersona,
    initialPermissions,
    restrictedModels = [],
    promptSuggestions,
    locationInfo // For market context
}: { 
    initialTitle?: string;
    onSubmit?: (message: string) => Promise<void>; 
    hideHeader?: boolean;
    onBack?: () => void;
    className?: string;
    isAuthenticated?: boolean;
    isSuperUser?: boolean;
    isHired?: boolean;
    persona?: AgentPersona;
    initialPermissions?: any[];
    restrictedModels?: ThinkingLevel[];
    promptSuggestions?: string[];
    locationInfo?: any;
}) {
    // Refs for UI focus (not managed by hook)
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    // Call Hook
    const {
        state, input, setInput, isProcessing, streamingMessageId, attachments, integrationStatus,
        persona, setPersona, thinkingLevel, setThinkingLevel, selectedProjectId, setSelectedProjectId,
        toolMode, setToolMode, selectedTools, isHireModalOpen, setIsHireModalOpen, selectedHirePlan,
        showPermissions, setShowPermissions, submitMessage, handleFileSelect, handleAudioComplete,
        handleToggleTool, handleGrantPermission, handleShowToolInfo, openHireModal, removeAttachment
    } = usePuffChatLogic({
        initialTitle,
        onSubmit,
        isAuthenticated,
        isSuperUser,
        isHired,
        persona: initialPersona,
        initialPermissions,
        restrictedModels,
        locationInfo,
        focusInput: useCallback(() => {
            // Focus logic
             setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    if (isMobile) textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }, [isMobile])
    });

    const { currentMessages, setActiveArtifact, setArtifactPanelOpen, currentArtifacts, activeArtifactId, isArtifactPanelOpen } = useAgentChatStore();

    // --- Legacy UI Effects (Scrolling) ---
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }, []);

    // Textarea Auto-height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    // Scroll on message change
    useEffect(() => {
        if (currentMessages.length > 0) scrollToBottom();
    }, [currentMessages.length, isProcessing, scrollToBottom]);

    // Scroll during streaming
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        if (streamingMessageId) {
            intervalId = setInterval(() => scrollToBottom('auto'), 100);
        }
        return () => clearInterval(intervalId);
    }, [streamingMessageId, scrollToBottom]);

    const handleSubmit = () => submitMessage(input);
    const handleStop = () => setIsProcessing(false); 
    
    // Map store messages to PuffMessage for display logic
    const displayMessages: PuffMessage[] = currentMessages.map(m => ({
        id: m.id,
        role: m.type, 
        content: m.content,
        timestamp: new Date(m.timestamp),
        isThinking: m.thinking?.isThinking,
        steps: m.thinking?.steps,
        metadata: m.metadata,
        workDuration: 0
    } as any));

    const hasMessages = displayMessages.length > 0;
    // Use prop or fallback
    const suggestions = promptSuggestions || ["Draft a New Drop", "Audit my Brand", "Pricing Plans", "Check System Health"];

    // Input Area JSX
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
                <div className="flex gap-2">
                     <textarea
                        ref={textareaRef}
                        id="puff-chat-input"
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
                         
                        <div className="h-4 w-[1px] bg-border mx-1" />

                        <div className="flex items-center gap-1">
                            <PersonaSelector value={persona} onChange={setPersona} isSuperUser={isSuperUser} isAuthenticated={isAuthenticated} />
                            <ModelSelector 
                                value={thinkingLevel} 
                                onChange={setThinkingLevel} 
                                userPlan="pro" 
                                unlockResearch={true} 
                                isSuperUser={isSuperUser}
                                restrictedLevels={restrictedModels}
                            />
                            <ToolSelector
                                mode={toolMode}
                                selectedTools={selectedTools}
                                onModeChange={setToolMode}
                                onToggleTool={handleToggleTool}
                                integrationStatus={integrationStatus}
                                onConnectTool={handleGrantPermission}
                                onShowToolInfo={handleShowToolInfo}
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
                            isProcessing={false}
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
             {isProcessing && hasMessages && (
                <div className="mt-2 text-center">
                    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                        <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                        <span>Work in progress...</span>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className={cn("flex flex-col h-full bg-background border-2 border-red-500", className)}>
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
                </div>
            )}

            <div className="flex flex-1 min-h-0 relative">
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    <div 
                        ref={scrollAreaRef}
                        className="flex-1 w-full bg-slate-50/30 overflow-y-auto min-h-0"
                    >
                <div className="p-4 space-y-4 min-h-full pb-8">
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
                            
                            {suggestions.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full px-4 pt-4">
                                    {suggestions.map((suggestion, i) => (
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

                    {hasMessages && displayMessages.map(message => (
                        <div key={message.id}>
                            {message.role === 'user' ? (
                                <div className="flex justify-end group items-start gap-2">
                                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%] shadow-sm">
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 max-w-[90%]">
                                    {message.isThinking && message.steps && message.steps.length > 0 && (
                                        <ThoughtBubble 
                                            steps={message.steps} 
                                            isThinking={message.isThinking || false} 
                                            agentName={message.metadata?.agentName}
                                            duration={message.workDuration}
                                        />
                                    )}
                                    
                                    {message.isThinking && (!message.steps || message.steps.length === 0) && (
                                        <ThinkingIndicator duration={message.workDuration} />
                                    )}

                                    {!message.isThinking && (
                                        <div className="bg-white rounded-2xl rounded-tl-sm border px-6 py-5 shadow-sm">
                                            {message.metadata?.type === 'system_health' && (
                                                <SystemHealthCheck 
                                                    status={message.metadata.data} 
                                                    onConnect={handleGrantPermission}
                                                    onRefresh={() => submitMessage('Check System Health Status')}
                                                />
                                            )}

                                            {message.metadata?.type === 'permission_info' && (
                                                <Card className="mt-2 mb-4 border-emerald-200 bg-emerald-50/50">
                                                    <CardContent className="p-0">
                                                        <PermissionCard 
                                                            permission={message.metadata.data} 
                                                            onGrant={() => {}} 
                                                        />
                                                    </CardContent>
                                                </Card>
                                            )}

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

                                            <div className="prose prose-sm max-w-none group relative text-sm leading-relaxed space-y-2">
                                                    {(() => {
                                                        const contentStr = typeof message.content === 'string' ? message.content : JSON.stringify(message.content, null, 2);
                                                        const isStreaming = streamingMessageId === message.id;
                                                        const isLongStructured = contentStr.length > 300 && (contentStr.includes('## ') || contentStr.includes('### '));
                                                        
                                                        if (isStreaming) {
                                                            return (
                                                                <TypewriterText 
                                                                    text={contentStr}
                                                                    speed={15}
                                                                    delay={500}
                                                                    onComplete={() => {}} // Handle internal state locally
                                                                    className="whitespace-pre-wrap"
                                                                />
                                                            );
                                                        }
                                                        
                                                        // Standard Render for now (Collapsible removed for brevity)
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
                                                                                     <FileText className="h-4 w-4" />
                                                                                     <span>{children}</span>
                                                                                 </Button>
                                                                             );
                                                                         }
                                                                         return <a href={href} className="text-primary underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                                                                    },
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
                                                    })()}
                                            </div>
                                            
                                            <ChatFeedback 
                                                messageId={message.id} 
                                                content={typeof message.content === 'string' ? message.content : JSON.stringify(message.content)} 
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {state.permissions.length > 0 && showPermissions && (
                        <Card className="mt-4">
                            <CardContent className="p-0">
                                <div className="p-3 border-b">
                                    <h3 className="font-medium text-sm">Grant permissions to agent?</h3>
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

                    {state.triggers.length > 0 && (
                        <TriggerIndicator
                            triggers={state.triggers}
                            expanded={false} // Always collapsed by default
                            onToggle={() => {}} 
                        />
                    )}
                    
                    <div ref={messagesEndRef} className="h-4" />
                </div>
            </div>

            <div className="shrink-0 z-20 bg-background border-t pt-2 space-y-2 min-h-[60px] sticky bottom-0">
                {InputArea}
            </div>
          </div>
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

// ... helper definitions for ThinkingIndicator, StepsList, CreativeLoader ...
function ThinkingIndicator({ duration }: { duration?: number }) {
    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground italic p-2">
            <Sparkles className="h-3 w-3 animate-pulse text-purple-400" />
            <span>Thinking... {duration ? `(${duration}ms)` : ''}</span>
        </div>
    );
}


