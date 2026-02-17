'use client';

/**
 * Playbook Editor Component
 * Visual step builder for creating/editing playbooks
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Plus,
    Save,
    Play,
    Trash2,
    GripVertical,
    Clock,
    Zap,
    MousePointer,
    AlertTriangle,
    User
} from 'lucide-react';
import { Playbook, PlaybookStep, PlaybookTrigger, PlaybookCategory, TriggerType } from '@/types/playbook';
import { PlaybookStepCard } from './playbook-step-card';

// Available agents
const AGENTS = [
    { id: 'smokey', name: 'Smokey', description: 'Budtender & Recommendations' },
    { id: 'craig', name: 'Craig', description: 'Marketing & Content' },
    { id: 'pops', name: 'Pops', description: 'Analytics & Reporting' },
    { id: 'ezal', name: 'Ezal', description: 'Competitive Intel' },
    { id: 'money_mike', name: 'Money Mike', description: 'Pricing & Finance' },
    { id: 'deebo', name: 'Deebo', description: 'Compliance' },
    { id: 'mrs_parker', name: 'Mrs. Parker', description: 'Loyalty & Retention' },
];

const CATEGORIES: { id: PlaybookCategory; label: string }[] = [
    { id: 'intel', label: 'Intelligence' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'ops', label: 'Operations' },
    { id: 'seo', label: 'SEO' },
    { id: 'reporting', label: 'Reporting' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'custom', label: 'Custom' },
];

const TRIGGER_TYPES: { type: TriggerType; label: string; icon: React.ReactNode }[] = [
    { type: 'manual', label: 'Manual', icon: <MousePointer className="h-4 w-4" /> },
    { type: 'schedule', label: 'Schedule', icon: <Clock className="h-4 w-4" /> },
    { type: 'event', label: 'Event', icon: <Zap className="h-4 w-4" /> },
];

const EVENT_TYPES = [
    // Alleaves Events (POS)
    'customer.signup',
    'customer.updated',
    'order.created',
    'order.updated',
    'inventory.low_stock',
    'inventory.updated',
    'product.updated',
    // Ecommerce Events
    'cart.abandoned',
    'checkout.started',
    'checkout.completed',
    'order.completed',
    // Legacy
    'lead.created',
    'page.claimed',
    'review.received',
    'inventory.low',
];

interface PlaybookEditorProps {
    playbook?: Partial<Playbook>;
    onSave: (data: Partial<Playbook>) => Promise<void>;
    onCancel?: () => void;
    isNew?: boolean;
}

export function PlaybookEditor({ playbook, onSave, onCancel, isNew = false }: PlaybookEditorProps) {
    const [name, setName] = useState(playbook?.name || '');
    const [description, setDescription] = useState(playbook?.description || '');
    const [agent, setAgent] = useState(playbook?.agent || 'puff');
    const [category, setCategory] = useState<PlaybookCategory>(playbook?.category || 'custom');
    const [triggers, setTriggers] = useState<PlaybookTrigger[]>(playbook?.triggers || [{ type: 'manual' }]);
    const [steps, setSteps] = useState<PlaybookStep[]>(playbook?.steps || []);
    const [isSaving, setIsSaving] = useState(false);

    // Check if requires approval
    const requiresApproval = steps.some(s => 
        ['gmail.send', 'gmail.send_batch', 'email.send', 'notify'].includes(s.action) &&
        s.params?.to !== '{{current_user.email}}' && 
        s.params?.to !== '{{user.email}}'
    );

    const handleAddStep = useCallback(() => {
        const newStep: PlaybookStep = {
            id: crypto.randomUUID(),
            action: 'delegate',
            params: {},
            agent: agent,
            label: `Step ${steps.length + 1}`
        };
        setSteps([...steps, newStep]);
    }, [steps, agent]);

    const handleUpdateStep = useCallback((stepId: string, updates: Partial<PlaybookStep>) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
    }, []);

    const handleRemoveStep = useCallback((stepId: string) => {
        setSteps(prev => prev.filter(s => s.id !== stepId));
    }, []);

    const handleReorderStep = useCallback((fromIndex: number, toIndex: number) => {
        setSteps(prev => {
            const newSteps = [...prev];
            const [moved] = newSteps.splice(fromIndex, 1);
            newSteps.splice(toIndex, 0, moved);
            return newSteps;
        });
    }, []);

    const handleAddTrigger = useCallback((type: TriggerType) => {
        const newTrigger: PlaybookTrigger = { type };
        if (type === 'schedule') {
            newTrigger.cron = '0 9 * * 1'; // Default: Mon 9am
            newTrigger.timezone = 'America/Chicago';
        }
        if (type === 'event') {
            newTrigger.eventName = 'lead.created';
        }
        setTriggers([...triggers, newTrigger]);
    }, [triggers]);

    const handleRemoveTrigger = useCallback((index: number) => {
        setTriggers(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                name,
                description,
                agent,
                category,
                triggers,
                steps,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                    {isNew ? 'Create Playbook' : 'Edit Playbook'}
                </h2>
                <div className="flex items-center gap-2">
                    {onCancel && (
                        <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    )}
                    <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>

            {/* Approval Warning */}
            {requiresApproval && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">This playbook sends emails to customers and will require approval before each run.</span>
                </div>
            )}

            {/* Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="My Automation"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agent">Responsible Agent</Label>
                            <Select value={agent} onValueChange={setAgent}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AGENTS.map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{a.name}</span>
                                                <span className="text-xs text-muted-foreground">- {a.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this playbook do?"
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(c => (
                                <Badge
                                    key={c.id}
                                    variant={category === c.id ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => setCategory(c.id)}
                                >
                                    {c.label}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Triggers */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Triggers</CardTitle>
                        <div className="flex gap-1">
                            {TRIGGER_TYPES.map(t => (
                                <Button
                                    key={t.type}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAddTrigger(t.type)}
                                >
                                    {t.icon}
                                    <span className="ml-1">{t.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {triggers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No triggers configured. Add a trigger above.</p>
                    ) : (
                        <div className="space-y-2">
                            {triggers.map((trigger, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                                    {trigger.type === 'manual' && <MousePointer className="h-4 w-4" />}
                                    {trigger.type === 'schedule' && <Clock className="h-4 w-4" />}
                                    {trigger.type === 'event' && <Zap className="h-4 w-4" />}
                                    
                                    <span className="font-medium capitalize">{trigger.type}</span>
                                    
                                    {trigger.type === 'schedule' && (
                                        <Input
                                            className="w-32 h-8"
                                            placeholder="Cron"
                                            value={trigger.cron || ''}
                                            onChange={(e) => {
                                                const updated = [...triggers];
                                                updated[idx] = { ...trigger, cron: e.target.value };
                                                setTriggers(updated);
                                            }}
                                        />
                                    )}
                                    
                                    {trigger.type === 'event' && (
                                        <Select
                                            value={trigger.eventName || ''}
                                            onValueChange={(v) => {
                                                const updated = [...triggers];
                                                updated[idx] = { ...trigger, eventName: v };
                                                setTriggers(updated);
                                            }}
                                        >
                                            <SelectTrigger className="w-40 h-8">
                                                <SelectValue placeholder="Event" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EVENT_TYPES.map(e => (
                                                    <SelectItem key={e} value={e}>{e}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 ml-auto"
                                        onClick={() => handleRemoveTrigger(idx)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Steps */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Steps</CardTitle>
                        <Button size="sm" onClick={handleAddStep}>
                            <Plus className="h-4 w-4 mr-1" /> Add Step
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {steps.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No steps yet. Click "Add Step" to start building your workflow.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {steps.map((step, idx) => (
                                <PlaybookStepCard
                                    key={step.id}
                                    step={step}
                                    index={idx}
                                    onUpdate={(updates) => handleUpdateStep(step.id || '', updates)}
                                    onRemove={() => handleRemoveStep(step.id || '')}
                                    onMoveUp={idx > 0 ? () => handleReorderStep(idx, idx - 1) : undefined}
                                    onMoveDown={idx < steps.length - 1 ? () => handleReorderStep(idx, idx + 1) : undefined}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Owner Info (if editing) */}
            {playbook?.ownerId && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>Created by: {playbook.ownerName || playbook.createdBy}</span>
                </div>
            )}
        </div>
    );
}
