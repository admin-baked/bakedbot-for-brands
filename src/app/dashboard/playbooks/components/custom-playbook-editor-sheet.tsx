'use client';

/**
 * Custom Playbook Editor Sheet
 *
 * Slide-out sheet for creating or editing a custom playbook.
 * Fields: name, description, agent, category, trigger type + schedule.
 */

import { useState, useEffect } from 'react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Zap, Calendar, MousePointer } from 'lucide-react';
import type { Playbook, PlaybookCategory, PlaybookTrigger } from '@/types/playbook';
import { createCustomPlaybook, updateCustomPlaybook } from '@/server/actions/custom-playbooks';

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENTS = [
    { value: 'craig', label: 'Craig — Marketing & Campaigns' },
    { value: 'smokey', label: 'Smokey — Menu & Products' },
    { value: 'ezal', label: 'Ezal — Competitive Intelligence' },
    { value: 'deebo', label: 'Deebo — Compliance' },
    { value: 'big_worm', label: 'Big Worm — Analytics & Reporting' },
] as const;

const CATEGORIES: { value: PlaybookCategory; label: string }[] = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'ops', label: 'Operations' },
    { value: 'intel', label: 'Competitive Intel' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'custom', label: 'Custom' },
];

const SCHEDULE_PRESETS: { value: string; label: string; cron: string }[] = [
    { value: 'daily', label: 'Daily (7 AM)', cron: '0 7 * * *' },
    { value: 'weekly', label: 'Weekly (Monday 9 AM)', cron: '0 9 * * 1' },
    { value: 'monthly', label: 'Monthly (1st, 8 AM)', cron: '0 8 1 * *' },
    { value: 'custom', label: 'Custom cron…', cron: '' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface CustomPlaybookEditorSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgId: string;
    /** Pass existing playbook to edit; omit for create mode */
    playbook?: Playbook;
    onSaved: (playbookId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CustomPlaybookEditorSheet({
    open,
    onOpenChange,
    orgId,
    playbook,
    onSaved,
}: CustomPlaybookEditorSheetProps) {
    const isEdit = !!playbook;

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [agent, setAgent] = useState('craig');
    const [category, setCategory] = useState<PlaybookCategory>('marketing');
    const [triggerType, setTriggerType] = useState<'manual' | 'schedule'>('manual');
    const [schedulePreset, setSchedulePreset] = useState('daily');
    const [customCron, setCustomCron] = useState('');
    const [timezone, setTimezone] = useState('America/New_York');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Populate from existing playbook on open
    useEffect(() => {
        if (!open) return;
        if (playbook) {
            setName(playbook.name);
            setDescription(playbook.description ?? '');
            setAgent(playbook.agent);
            setCategory(playbook.category);
            const firstTrigger = playbook.triggers?.[0];
            if (firstTrigger?.type === 'schedule') {
                setTriggerType('schedule');
                const cron = firstTrigger.cron ?? '';
                const preset = SCHEDULE_PRESETS.find((p) => p.cron === cron);
                setSchedulePreset(preset?.value ?? 'custom');
                setCustomCron(cron);
                setTimezone(firstTrigger.timezone ?? 'America/New_York');
            } else {
                setTriggerType('manual');
                setSchedulePreset('daily');
                setCustomCron('');
            }
        } else {
            // Reset for create
            setName('');
            setDescription('');
            setAgent('craig');
            setCategory('marketing');
            setTriggerType('manual');
            setSchedulePreset('daily');
            setCustomCron('');
            setTimezone('America/New_York');
        }
        setError(null);
    }, [open, playbook]);

    const buildTrigger = (): PlaybookTrigger => {
        if (triggerType === 'manual') return { type: 'manual' };
        const cron = schedulePreset === 'custom'
            ? customCron
            : (SCHEDULE_PRESETS.find((p) => p.value === schedulePreset)?.cron ?? '0 7 * * *');
        return { type: 'schedule', cron, timezone };
    };

    const canSave = name.trim().length > 0
        && (triggerType === 'manual' || (schedulePreset !== 'custom' || customCron.trim().length > 0));

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const triggers = [buildTrigger()];

            if (isEdit && playbook) {
                const result = await updateCustomPlaybook(orgId, playbook.id, {
                    name,
                    description,
                    agent,
                    category,
                    triggers,
                });
                if (!result.success) throw new Error(result.error);
                onSaved(playbook.id);
            } else {
                const result = await createCustomPlaybook(orgId, {
                    name,
                    description,
                    agent,
                    category,
                    triggers,
                });
                if (!result.success) throw new Error(result.error);
                onSaved(result.playbookId);
            }
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save playbook');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isEdit ? 'Edit Playbook' : 'New Custom Playbook'}</SheetTitle>
                    <SheetDescription>
                        {isEdit
                            ? 'Update the playbook settings below.'
                            : 'Build a reusable automation that runs on a schedule or trigger.'}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-5 mt-6">
                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="pb-name">Playbook Name <span className="text-destructive">*</span></Label>
                        <Input
                            id="pb-name"
                            placeholder="e.g. Weekly Win-Back Email"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <Label htmlFor="pb-desc">Description</Label>
                        <Textarea
                            id="pb-desc"
                            placeholder="What does this playbook do?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Agent */}
                    <div className="space-y-1.5">
                        <Label>Agent</Label>
                        <Select value={agent} onValueChange={setAgent}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose agent" />
                            </SelectTrigger>
                            <SelectContent>
                                {AGENTS.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={(v) => setCategory(v as PlaybookCategory)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Trigger type */}
                    <div className="space-y-1.5">
                        <Label>Trigger</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={triggerType === 'manual' ? 'default' : 'outline'}
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setTriggerType('manual')}
                            >
                                <MousePointer className="h-3.5 w-3.5" /> Manual
                            </Button>
                            <Button
                                type="button"
                                variant={triggerType === 'schedule' ? 'default' : 'outline'}
                                size="sm"
                                className="gap-1.5"
                                onClick={() => setTriggerType('schedule')}
                            >
                                <Calendar className="h-3.5 w-3.5" /> Scheduled
                            </Button>
                        </div>
                    </div>

                    {/* Schedule options */}
                    {triggerType === 'schedule' && (
                        <div className="space-y-3 pl-1 border-l-2 border-primary/20">
                            <div className="space-y-1.5">
                                <Label>Frequency</Label>
                                <Select value={schedulePreset} onValueChange={setSchedulePreset}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SCHEDULE_PRESETS.map((p) => (
                                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {schedulePreset === 'custom' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="pb-cron">Cron Expression</Label>
                                    <Input
                                        id="pb-cron"
                                        placeholder="0 9 * * 1  (Mon 9am)"
                                        value={customCron}
                                        onChange={(e) => setCustomCron(e.target.value)}
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="pb-tz">Timezone</Label>
                                <Select value={timezone} onValueChange={setTimezone}>
                                    <SelectTrigger id="pb-tz">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                                        <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                                        <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                                        <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !canSave} className="gap-2">
                            {saving ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                            ) : (
                                <><Zap className="h-4 w-4" /> {isEdit ? 'Save Changes' : 'Create Playbook'}</>
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
