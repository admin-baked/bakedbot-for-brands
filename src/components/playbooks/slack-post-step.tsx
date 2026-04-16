'use client';

/**
 * Slack Post Step — Playbook wizard step builder
 *
 * Lets dispensary admins and budtenders add a "Send Slack Message" step
 * to any Playbook. Supports preset content types and freeform prompts.
 *
 * Usage:
 *   <SlackPostStep value={step} onChange={setStep} channels={channels} />
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import type { SlackChannelInfo } from '@/types/notification-preferences';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlackPostContentType =
    | 'competitive_snapshot'
    | 'sales_summary'
    | 'inventory_alert'
    | 'morning_briefing'
    | 'custom_report'
    | 'freeform';

export interface SlackPostStepConfig {
    action: 'slack-post';
    params: {
        channel?: string;
        contentType: SlackPostContentType;
        agentId?: string;
        prompt?: string;
        competitor?: string;
    };
    label?: string;
}

interface Props {
    value: Partial<SlackPostStepConfig['params']>;
    onChange: (params: SlackPostStepConfig['params']) => void;
    channels: SlackChannelInfo[];
}

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

interface PresetDef {
    value: SlackPostContentType;
    label: string;
    description: string;
    agentId: string;
    showCompetitorField?: boolean;
    showPromptField?: boolean;
}

const PRESETS: PresetDef[] = [
    {
        value: 'competitive_snapshot',
        label: 'Competitive Snapshot',
        description: 'Ezal summarizes a competitor\'s pricing and deals in 3 bullets',
        agentId: 'ezal',
        showCompetitorField: true,
    },
    {
        value: 'sales_summary',
        label: 'Sales Summary',
        description: 'Pops reports revenue and top products from the last 24 hours',
        agentId: 'pops',
    },
    {
        value: 'inventory_alert',
        label: 'Inventory Alert',
        description: 'Elroy flags slow-moving inventory that needs attention',
        agentId: 'elroy',
    },
    {
        value: 'morning_briefing',
        label: 'Morning Briefing',
        description: 'Elroy sends today\'s action items and at-risk customer list',
        agentId: 'elroy',
    },
    {
        value: 'custom_report',
        label: 'Custom AI Report',
        description: 'Write a prompt and an agent generates the message',
        agentId: 'elroy',
        showPromptField: true,
    },
    {
        value: 'freeform',
        label: 'Static Message',
        description: 'Write the exact message text — no AI generation',
        agentId: '',
        showPromptField: true,
    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SlackPostStep({ value, onChange, channels }: Props) {
    const [mode, setMode] = useState<'preset' | 'custom'>(
        value.contentType === 'custom_report' || value.contentType === 'freeform'
            ? 'custom'
            : 'preset',
    );

    const selectedPreset = PRESETS.find(p => p.value === value.contentType) ?? PRESETS[0];

    function patch(partial: Partial<SlackPostStepConfig['params']>) {
        onChange({
            contentType: value.contentType ?? 'competitive_snapshot',
            ...value,
            ...partial,
        });
    }

    function selectPreset(preset: PresetDef) {
        onChange({
            ...value,
            contentType: preset.value,
            agentId: preset.agentId || undefined,
            prompt: preset.showPromptField ? value.prompt : undefined,
        });
    }

    return (
        <div className="space-y-4">
            {/* Channel */}
            <div className="flex items-center gap-3">
                <Label className="w-28 shrink-0 text-sm">Channel</Label>
                <Select
                    value={value.channel ?? '__default__'}
                    onValueChange={v => patch({ channel: v === '__default__' ? undefined : v })}
                >
                    <SelectTrigger className="w-52 text-sm h-9">
                        <SelectValue placeholder="Org default" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__default__">
                            <span className="text-muted-foreground text-xs">Org default channel</span>
                        </SelectItem>
                        {channels.map(ch => (
                            <SelectItem key={ch.id} value={`#${ch.name}`} className="text-sm">
                                #{ch.name}{ch.is_private ? ' 🔒' : ''}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Content mode */}
            <div className="space-y-2">
                <Label className="text-sm">Content type</Label>
                <RadioGroup
                    value={mode}
                    onValueChange={(v: 'preset' | 'custom') => {
                        setMode(v);
                        if (v === 'custom') {
                            patch({ contentType: 'custom_report', agentId: 'elroy' });
                        } else {
                            patch({ contentType: 'competitive_snapshot', agentId: 'ezal', prompt: undefined });
                        }
                    }}
                    className="flex gap-4"
                >
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="preset" id="mode-preset" />
                        <Label htmlFor="mode-preset" className="text-sm font-normal cursor-pointer">
                            Use preset
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value="custom" id="mode-custom" />
                        <Label htmlFor="mode-custom" className="text-sm font-normal cursor-pointer">
                            Write prompt
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Preset picker */}
            {mode === 'preset' && (
                <div className="space-y-2">
                    <Select
                        value={value.contentType}
                        onValueChange={v => {
                            const preset = PRESETS.find(p => p.value === v);
                            if (preset) selectPreset(preset);
                        }}
                    >
                        <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Select a preset..." />
                        </SelectTrigger>
                        <SelectContent>
                            {PRESETS.filter(p => p.value !== 'custom_report' && p.value !== 'freeform').map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                    <div>
                                        <div className="font-medium text-sm">{p.label}</div>
                                        <div className="text-xs text-muted-foreground">{p.description}</div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedPreset.showCompetitorField && (
                        <div className="flex items-center gap-3 pt-1">
                            <Label className="w-28 shrink-0 text-sm">Competitor</Label>
                            <Input
                                className="h-9 text-sm"
                                placeholder="e.g. FlnnStoned Cannabis"
                                value={value.competitor ?? ''}
                                onChange={e => patch({ competitor: e.target.value })}
                            />
                        </div>
                    )}

                    {selectedPreset.value && (
                        <p className="text-xs text-muted-foreground">
                            Agent: <strong>{selectedPreset.agentId || 'BakedBot AI'}</strong> · {selectedPreset.description}
                        </p>
                    )}
                </div>
            )}

            {/* Custom prompt */}
            {mode === 'custom' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Label className="w-28 shrink-0 text-sm">Send as</Label>
                        <RadioGroup
                            value={value.contentType === 'freeform' ? 'freeform' : 'custom_report'}
                            onValueChange={v => patch({ contentType: v as SlackPostContentType })}
                            className="flex gap-4"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="custom_report" id="ct-ai" />
                                <Label htmlFor="ct-ai" className="text-sm font-normal cursor-pointer">
                                    AI-generated (from prompt)
                                </Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="freeform" id="ct-static" />
                                <Label htmlFor="ct-static" className="text-sm font-normal cursor-pointer">
                                    Static message
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Textarea
                        className="text-sm min-h-[80px] resize-none"
                        placeholder={
                            value.contentType === 'freeform'
                                ? 'Type the exact Slack message here...'
                                : 'e.g. "Track FlnnStoned pricing and summarize daily discounts in 3 bullets"'
                        }
                        value={value.prompt ?? ''}
                        onChange={e => patch({ prompt: e.target.value })}
                    />

                    {value.contentType !== 'freeform' && (
                        <div className="flex items-center gap-3">
                            <Label className="w-28 shrink-0 text-sm">Agent</Label>
                            <Select
                                value={value.agentId ?? 'elroy'}
                                onValueChange={v => patch({ agentId: v })}
                            >
                                <SelectTrigger className="w-40 h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="elroy">Uncle Elroy (Ops)</SelectItem>
                                    <SelectItem value="ezal">Ezal (Competitive Intel)</SelectItem>
                                    <SelectItem value="pops">Pops (Analytics)</SelectItem>
                                    <SelectItem value="craig">Craig (Marketing)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
