'use client';

/**
 * Playbook Step Card Component
 * Individual step in the playbook editor with drag handle and configuration
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    GripVertical,
    Trash2,
    ChevronUp,
    ChevronDown,
    User,
    Mail,
    Search,
    BarChart3,
    Shield,
    FileText,
} from 'lucide-react';
import { PlaybookStep } from '@/types/playbook';

// Available actions
const ACTIONS = [
    { id: 'delegate', label: 'Delegate to Agent', icon: <User className="h-4 w-4" /> },
    { id: 'gmail.send', label: 'Send Email', icon: <Mail className="h-4 w-4" /> },
    { id: 'query', label: 'Query Data', icon: <Search className="h-4 w-4" /> },
    { id: 'analyze', label: 'Analyze', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'generate', label: 'Generate Content', icon: <FileText className="h-4 w-4" /> },
    { id: 'deebo.check_content', label: 'Compliance Check', icon: <Shield className="h-4 w-4" /> },
    { id: 'notify', label: 'Notify', icon: <Mail className="h-4 w-4" /> },
];

const AGENTS = [
    { id: 'smokey', name: 'Smokey' },
    { id: 'craig', name: 'Craig' },
    { id: 'pops', name: 'Pops' },
    { id: 'ezal', name: 'Ezal' },
    { id: 'money_mike', name: 'Money Mike' },
    { id: 'deebo', name: 'Deebo' },
    { id: 'mrs_parker', name: 'Mrs. Parker' },
];

interface PlaybookStepCardProps {
    step: PlaybookStep;
    index: number;
    onUpdate: (updates: Partial<PlaybookStep>) => void;
    onRemove: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
}

export function PlaybookStepCard({
    step,
    index,
    onUpdate,
    onRemove,
    onMoveUp,
    onMoveDown,
}: PlaybookStepCardProps) {
    const actionConfig = ACTIONS.find(a => a.id === step.action);
    const showAgentSelect = ['delegate', 'query', 'analyze', 'generate'].includes(step.action);
    const showEmailParams = ['gmail.send', 'notify'].includes(step.action);

    return (
        <div className="flex items-start gap-2 p-3 border rounded-lg bg-white group hover:border-primary/50 transition-colors">
            {/* Drag Handle */}
            <div className="flex flex-col items-center gap-1 pt-1">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <span className="text-xs text-muted-foreground font-medium">{index + 1}</span>
            </div>

            {/* Step Content */}
            <div className="flex-1 space-y-3">
                {/* Step Label */}
                <div className="flex items-center gap-2">
                    <Input
                        className="h-8 font-medium"
                        value={step.label || ''}
                        onChange={(e) => onUpdate({ label: e.target.value })}
                        placeholder={`Step ${index + 1}`}
                    />
                </div>

                {/* Action Selection */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs">Action</Label>
                        <Select value={step.action} onValueChange={(v) => onUpdate({ action: v })}>
                            <SelectTrigger className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ACTIONS.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        <div className="flex items-center gap-2">
                                            {a.icon}
                                            <span>{a.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {showAgentSelect && (
                        <div>
                            <Label className="text-xs">Agent</Label>
                            <Select value={step.agent || ''} onValueChange={(v) => onUpdate({ agent: v })}>
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AGENTS.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {/* Email Parameters */}
                {showEmailParams && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">To</Label>
                            <Input
                                className="h-8"
                                value={(step.params?.to as string) || ''}
                                onChange={(e) => onUpdate({ params: { ...step.params, to: e.target.value } })}
                                placeholder="{{user.email}} or recipient"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Subject</Label>
                            <Input
                                className="h-8"
                                value={(step.params?.subject as string) || ''}
                                onChange={(e) => onUpdate({ params: { ...step.params, subject: e.target.value } })}
                                placeholder="Email subject"
                            />
                        </div>
                    </div>
                )}

                {/* Task Description (for delegate) */}
                {step.action === 'delegate' && (
                    <div>
                        <Label className="text-xs">Task</Label>
                        <Input
                            className="h-8"
                            value={(step.params?.task as string) || ''}
                            onChange={(e) => onUpdate({ params: { ...step.params, task: e.target.value } })}
                            placeholder="What should the agent do?"
                        />
                    </div>
                )}

                {/* Condition */}
                <div className="text-xs text-muted-foreground">
                    <Input
                        className="h-7 text-xs"
                        value={step.condition || ''}
                        onChange={(e) => onUpdate({ condition: e.target.value })}
                        placeholder="Condition (optional): e.g. {{previous_step.success}}"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
                {onMoveUp && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveUp}>
                        <ChevronUp className="h-3 w-3" />
                    </Button>
                )}
                {onMoveDown && (
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveDown}>
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                )}
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}>
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
