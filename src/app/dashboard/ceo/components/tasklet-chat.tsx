'use client';

// src/app/dashboard/ceo/components/tasklet-chat.tsx
/**
 * Tasklet-Style Chat Component
 * Shows tool permissions, connection grants, and conversational flow
 * Designed for automation setup and ongoing conversation
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    ArrowLeft,
    Upload,
    Mic,
    ChevronDown,
    ChevronUp,
    Check,
    Loader2,
    Mail,
    FolderOpen,
    Calendar,
    Globe,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ Types ============

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
}

export interface TaskletState {
    title: string;
    isConnected: boolean;
    permissions: ToolPermission[];
    triggers: TaskletTrigger[];
    messages: TaskletMessage[];
}

// ============ Sub-components ============

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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Worked for {duration || 0}s</span>
            <ChevronDown className="h-4 w-4" />
        </div>
    );
}

// ============ Main Component ============

export interface TaskletChatProps {
    initialTitle?: string;
    onBack?: () => void;
    onSubmit?: (message: string) => Promise<void>;
}

export function TaskletChat({
    initialTitle = 'New Automation',
    onBack,
    onSubmit
}: TaskletChatProps) {
    const [state, setState] = useState<TaskletState>({
        title: initialTitle,
        isConnected: true,
        permissions: [],
        triggers: [],
        messages: [],
    });
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showTriggers, setShowTriggers] = useState(false);
    const [showPermissions, setShowPermissions] = useState(true);

    const handleSubmit = useCallback(async () => {
        if (!input.trim() || isProcessing) return;

        const userMessage: TaskletMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
            // Auto-generate title from first message
            title: prev.messages.length === 0 ? input.slice(0, 40) + (input.length > 40 ? '...' : '') : prev.title,
        }));

        const userInput = input;
        setInput('');
        setIsProcessing(true);

        // Add thinking message
        const thinkingId = `thinking-${Date.now()}`;
        setState(prev => ({
            ...prev,
            messages: [...prev.messages, {
                id: thinkingId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isThinking: true,
                workDuration: 0,
            }],
        }));

        // Simulate work duration
        let duration = 0;
        const durationInterval = setInterval(() => {
            duration++;
            setState(prev => ({
                ...prev,
                messages: prev.messages.map(m =>
                    m.id === thinkingId ? { ...m, workDuration: duration } : m
                ),
            }));
        }, 1000);

        try {
            // Simulate AI response with tool setup
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if message mentions integrations
            const needsGmail = userInput.toLowerCase().includes('email') || userInput.toLowerCase().includes('send');
            const needsDrive = userInput.toLowerCase().includes('spreadsheet') || userInput.toLowerCase().includes('sheet') || userInput.toLowerCase().includes('save');
            const needsSchedule = userInput.toLowerCase().includes('daily') || userInput.toLowerCase().includes('weekly');

            const newPermissions: ToolPermission[] = [];
            const newTriggers: TaskletTrigger[] = [];

            if (needsGmail) {
                newPermissions.push({
                    id: 'gmail',
                    name: 'Gmail',
                    icon: 'mail',
                    email: 'martez@bakedbot.ai',
                    description: 'An integration with Gmail, the email service from Google. Allows reading, searching, and sending emails and creating drafts.',
                    status: 'granted',
                    tools: ['Send Message'],
                });
            }

            if (needsDrive) {
                newPermissions.push({
                    id: 'gdrive',
                    name: 'Google Drive',
                    icon: 'drive',
                    email: 'martez@bakedbot.ai',
                    description: 'An integration with Google Drive. Allows search and access of files, as well as the creation and editing of Docs and Sheets.',
                    status: 'granted',
                    tools: ['Create Google Sheets Sp...', 'Get Google Sheets Sprea...', 'Update Google Sheets Ce...'],
                });
            }

            if (needsSchedule) {
                newTriggers.push({
                    id: 'schedule-1',
                    type: 'schedule',
                    label: 'Daily at 9:00 AM',
                });
            }

            clearInterval(durationInterval);

            // Generate response
            const responseContent = `I love this idea! Let me set up a daily deal hunting automation for these two dispensaries. Here's what I'll do:

1. **Research the sites daily** for offers and deals
2. **Track everything in a spreadsheet** for easy auditing  
3. **Send daily emails** with the finds to Jack and you
4. **Run it immediately** to get today's deals

${newPermissions.length > 0 ? `Perfect! I've connected to ${newPermissions.map(p => p.name).join(' and ')}. Let me get the tools available for those connections.` : ''}

${newTriggers.length > 0 ? `I've also set up ${newTriggers.length} trigger${newTriggers.length > 1 ? 's' : ''} to run this automation daily.` : ''}

Would you like me to run the first automation now?`;

            setState(prev => ({
                ...prev,
                permissions: [...prev.permissions, ...newPermissions],
                triggers: [...prev.triggers, ...newTriggers],
                messages: prev.messages.map(m =>
                    m.id === thinkingId
                        ? { ...m, content: responseContent, isThinking: false, workDuration: duration }
                        : m
                ),
            }));

            if (newPermissions.length > 0) {
                setShowPermissions(true);
            }

        } catch (error) {
            clearInterval(durationInterval);
            setState(prev => ({
                ...prev,
                messages: prev.messages.map(m =>
                    m.id === thinkingId
                        ? { ...m, content: 'I ran into an issue. Please try again.', isThinking: false }
                        : m
                ),
            }));
        }

        setIsProcessing(false);

        if (onSubmit) {
            await onSubmit(userInput);
        }
    }, [input, isProcessing, onSubmit]);

    const handleGrantPermission = (permissionId: string) => {
        setState(prev => ({
            ...prev,
            permissions: prev.permissions.map(p =>
                p.id === permissionId ? { ...p, status: 'granted' } : p
            ),
        }));
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
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

            {/* Content Area */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Messages */}
                    {state.messages.map(message => (
                        <div key={message.id}>
                            {message.role === 'user' ? (
                                <div className="flex justify-end">
                                    <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {message.isThinking ? (
                                        <ThinkingIndicator duration={message.workDuration} />
                                    ) : (
                                        <>
                                            {message.workDuration && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                                    <Sparkles className="h-3 w-3" />
                                                    <span>Worked for {message.workDuration}s</span>
                                                    <ChevronDown className="h-3 w-3" />
                                                </div>
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

            {/* Input Area */}
            <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Reply to Tasklet..."
                            className="min-h-[44px] max-h-[120px] pr-24 resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Upload className="h-4 w-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground px-2">Standard</span>
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Mic className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                {isProcessing && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '11%' }} />
                        </div>
                        <span>11%</span>
                    </div>
                )}
            </div>
        </div>
    );
}
