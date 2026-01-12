'use client';

/**
 * Playbook Setup Wizard
 * 
 * Multi-step dialog for configuring a recommended playbook:
 * 1. Permission request (if needed)
 * 2. Setup questions
 * 3. Confirmation
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Shield, ArrowRight, Loader2 } from 'lucide-react';
import type { RecommendedPlaybook, PlaybookPermission, SetupQuestion } from './smokey-recommends';

// =============================================================================
// TYPES
// =============================================================================

export interface PlaybookConfig {
    playbookId: string;
    answers: Record<string, string | number | string[]>;
    permissionsGranted: PlaybookPermission[];
    enabledAt: Date;
}

type WizardStep = 'permissions' | 'setup' | 'confirm';

// =============================================================================
// PERMISSION DESCRIPTIONS
// =============================================================================

const PERMISSION_INFO: Record<PlaybookPermission, { title: string; description: string }> = {
    email: {
        title: 'Email',
        description: 'Send emails to customers on your behalf',
    },
    sms: {
        title: 'SMS',
        description: 'Send text messages to customers',
    },
    pos_integration: {
        title: 'POS Integration',
        description: 'Read sales and inventory data from your point-of-sale',
    },
    crm: {
        title: 'Customer Data',
        description: 'Access customer purchase history and preferences',
    },
    google_business: {
        title: 'Google Business Profile',
        description: 'Read and respond to Google reviews',
    },
    push_notifications: {
        title: 'Push Notifications',
        description: 'Send push notifications to app users',
    },
    wholesale: {
        title: 'Wholesale Platform',
        description: 'Sync inventory and orders with LeafLink/LeafTrade',
    },
    traceability: {
        title: 'State Traceability',
        description: 'Read batch data from Metrc/BioTrack',
    },
    scanner: {
        title: 'Menu Scanner',
        description: 'Monitor competitor menus and pricing',
    },
    location: {
        title: 'Location Services',
        description: 'Find deals and drops near you',
    },
    notifications: {
        title: 'Push Notifications',
        description: 'Get alerted instantly on your device',
    },
    preferences: {
        title: 'Taste Profile',
        description: 'Access your strain preferences and history',
    },
};

// =============================================================================
// COMPONENT
// =============================================================================

interface PlaybookSetupWizardProps {
    playbook: RecommendedPlaybook;
    open: boolean;
    onComplete: (config: PlaybookConfig) => void;
    onCancel: () => void;
}

export function PlaybookSetupWizard({
    playbook,
    open,
    onComplete,
    onCancel,
}: PlaybookSetupWizardProps) {
    const hasPermissions = playbook.permissions.length > 0;
    const hasQuestions = playbook.setupQuestions.length > 0;

    const [step, setStep] = useState<WizardStep>(hasPermissions ? 'permissions' : 'setup');
    const [permissionsGranted, setPermissionsGranted] = useState<PlaybookPermission[]>([]);
    const [answers, setAnswers] = useState<Record<string, string | number | string[]>>(() => {
        // Initialize with default values
        const defaults: Record<string, string | number | string[]> = {};
        playbook.setupQuestions.forEach(q => {
            if (q.defaultValue !== undefined) {
                defaults[q.id] = q.defaultValue;
            }
        });
        return defaults;
    });
    const [saving, setSaving] = useState(false);

    const handlePermissionToggle = (permission: PlaybookPermission) => {
        setPermissionsGranted(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const handleAnswerChange = (questionId: string, value: string | number | string[]) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNextStep = () => {
        if (step === 'permissions') {
            setStep(hasQuestions ? 'setup' : 'confirm');
        } else if (step === 'setup') {
            setStep('confirm');
        }
    };

    const handlePrevStep = () => {
        if (step === 'setup' && hasPermissions) {
            setStep('permissions');
        } else if (step === 'confirm') {
            setStep(hasQuestions ? 'setup' : 'permissions');
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        
        // Simulate save delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const config: PlaybookConfig = {
            playbookId: playbook.id,
            answers,
            permissionsGranted,
            enabledAt: new Date(),
        };

        onComplete(config);
        setSaving(false);
    };

    const allPermissionsGranted = playbook.permissions.every(p => permissionsGranted.includes(p));

    const requiredQuestionsAnswered = playbook.setupQuestions
        .filter(q => q.required)
        .every(q => answers[q.id] !== undefined && answers[q.id] !== '');

    const canProceedFromPermissions = allPermissionsGranted;
    const canProceedFromSetup = requiredQuestionsAnswered;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {playbook.icon}
                        <span>Set Up {playbook.name}</span>
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'permissions' && 'Grant permissions to enable this automation.'}
                        {step === 'setup' && 'Configure how this playbook works for you.'}
                        {step === 'confirm' && 'Review and activate your playbook.'}
                    </DialogDescription>
                </DialogHeader>

                {/* STEP: Permissions */}
                {step === 'permissions' && (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            <span>This playbook requires access to:</span>
                        </div>
                        <div className="space-y-3">
                            {playbook.permissions.map(permission => {
                                const info = PERMISSION_INFO[permission];
                                const isGranted = permissionsGranted.includes(permission);
                                return (
                                    <div
                                        key={permission}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            isGranted ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => handlePermissionToggle(permission)}
                                    >
                                        <Checkbox
                                            checked={isGranted}
                                            onCheckedChange={() => handlePermissionToggle(permission)}
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{info.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {info.description}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP: Setup Questions */}
                {step === 'setup' && (
                    <div className="space-y-4 py-4">
                        {playbook.setupQuestions.map(question => (
                            <div key={question.id} className="space-y-2">
                                <Label htmlFor={question.id}>
                                    {question.label}
                                    {question.required && <span className="text-destructive ml-1">*</span>}
                                </Label>
                                
                                {question.type === 'text' && (
                                    <Input
                                        id={question.id}
                                        placeholder={question.placeholder}
                                        value={(answers[question.id] as string) || ''}
                                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                    />
                                )}

                                {question.type === 'number' && (
                                    <Input
                                        id={question.id}
                                        type="number"
                                        placeholder={question.placeholder}
                                        value={(answers[question.id] as number) || ''}
                                        onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value) || 0)}
                                    />
                                )}

                                {question.type === 'select' && question.options && (
                                    <Select
                                        value={(answers[question.id] as string) || ''}
                                        onValueChange={(value) => handleAnswerChange(question.id, value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {question.options.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {question.type === 'multi-select' && question.options && (
                                    <div className="flex flex-wrap gap-2">
                                        {question.options.map(opt => {
                                            const selected = (answers[question.id] as string[] || []).includes(opt.value);
                                            return (
                                                <Badge
                                                    key={opt.value}
                                                    variant={selected ? 'default' : 'outline'}
                                                    className="cursor-pointer"
                                                    onClick={() => {
                                                        const current = (answers[question.id] as string[]) || [];
                                                        const updated = selected
                                                            ? current.filter(v => v !== opt.value)
                                                            : [...current, opt.value];
                                                        handleAnswerChange(question.id, updated);
                                                    }}
                                                >
                                                    {opt.label}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}

                        {playbook.setupQuestions.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                <p>No additional configuration needed.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP: Confirm */}
                {step === 'confirm' && (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-medium">Ready to activate</span>
                        </div>
                        
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                            <div className="font-medium">{playbook.name}</div>
                            <div className="text-muted-foreground">
                                Runs: <span className="text-foreground">{playbook.trigger}</span>
                            </div>
                            <div className="text-muted-foreground">
                                Agents: <span className="text-foreground">{playbook.agents.join(', ')}</span>
                            </div>
                        </div>

                        {Object.keys(answers).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                                Your configuration has been saved. You can edit settings anytime.
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="flex gap-2">
                    {step !== 'permissions' && hasPermissions && step !== 'confirm' && (
                        <Button variant="ghost" onClick={handlePrevStep}>
                            Back
                        </Button>
                    )}
                    
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>

                    {step === 'confirm' ? (
                        <Button onClick={handleComplete} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Activating...
                                </>
                            ) : (
                                <>
                                    Activate Playbook
                                    <CheckCircle2 className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNextStep}
                            disabled={
                                (step === 'permissions' && !canProceedFromPermissions) ||
                                (step === 'setup' && !canProceedFromSetup)
                            }
                        >
                            Continue
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
