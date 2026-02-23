'use client';

/**
 * PlaybookEditSheet
 *
 * Zapier-like slide-out sheet for editing playbook trigger timing and delivery.
 *
 * Handles two use cases:
 *   1. Dispensary managed playbooks (PlaybookDefinition from config)
 *      → caller provides onSave({ trigger, delivery })
 *   2. Brand/custom Firestore playbooks (full Playbook type)
 *      → caller provides onSave({ trigger, delivery })
 *
 * Delivery section is shown for any playbook that has an email/sms delivery
 * step. Callers pass `hasDelivery` and `initialDelivery` to opt in.
 */

import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Mail, MessageSquare, Bell } from 'lucide-react';
import type { PlaybookTrigger } from '@/types/playbook';
import { TriggerEditorPanel } from './trigger-editor-panel';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeliveryChannel = 'email' | 'sms' | 'inbox';

export interface DeliveryConfig {
    channels: DeliveryChannel[];
    emailTo?: string;
    phoneNumber?: string;
    reportFormat?: 'brief' | 'detailed';
}

export interface PlaybookEditSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    playbookName: string;
    playbookDescription?: string;
    /** Initial trigger to populate the editor */
    initialTrigger: PlaybookTrigger;
    /** Show the delivery configuration section */
    hasDelivery?: boolean;
    initialDelivery?: DeliveryConfig;
    /** Async save handler; sheet stays open on error */
    onSave: (trigger: PlaybookTrigger, delivery: DeliveryConfig) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_DELIVERY: DeliveryConfig = {
    channels: ['inbox'],
    emailTo: '',
    phoneNumber: '',
    reportFormat: 'brief',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PlaybookEditSheet({
    open,
    onOpenChange,
    playbookName,
    playbookDescription,
    initialTrigger,
    hasDelivery = false,
    initialDelivery,
    onSave,
}: PlaybookEditSheetProps) {
    const [trigger, setTrigger] = useState<PlaybookTrigger>(initialTrigger);
    const [delivery, setDelivery] = useState<DeliveryConfig>(
        initialDelivery ?? DEFAULT_DELIVERY
    );
    const [saving, setSaving] = useState(false);

    // Reset state whenever the sheet opens with new data
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setTrigger(initialTrigger);
            setDelivery(initialDelivery ?? DEFAULT_DELIVERY);
        }
        onOpenChange(isOpen);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(trigger, delivery);
            onOpenChange(false);
        } finally {
            setSaving(false);
        }
    };

    const toggleChannel = (ch: DeliveryChannel) => {
        setDelivery((prev) => {
            const has = prev.channels.includes(ch);
            const next = has
                ? prev.channels.filter((c) => c !== ch)
                : [...prev.channels, ch];
            // Always keep at least 'inbox'
            return { ...prev, channels: next.length ? next : ['inbox'] };
        });
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden"
            >
                {/* ── Header ─────────────────────────────────────────────────── */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <SheetTitle className="text-base font-semibold leading-tight">
                        Configure Playbook
                    </SheetTitle>
                    <SheetDescription className="text-sm font-medium text-foreground">
                        {playbookName}
                    </SheetDescription>
                    {playbookDescription && (
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                            {playbookDescription}
                        </p>
                    )}
                </SheetHeader>

                {/* ── Scrollable body ─────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                    {/* Trigger section */}
                    <section className="space-y-3">
                        <div>
                            <h3 className="text-sm font-semibold">When should it run?</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Choose a schedule, a trigger event, or run manually.
                            </p>
                        </div>
                        <TriggerEditorPanel trigger={trigger} onChange={setTrigger} />
                    </section>

                    {/* Delivery section */}
                    {hasDelivery && (
                        <>
                            <Separator />
                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold">How should results be delivered?</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Results always appear in your Inbox. Add email or SMS too.
                                    </p>
                                </div>

                                {/* Channel checkboxes */}
                                <div className="space-y-2">
                                    {(
                                        [
                                            { id: 'inbox', icon: Bell, label: 'Inbox (always on)' },
                                            { id: 'email', icon: Mail, label: 'Email' },
                                            { id: 'sms', icon: MessageSquare, label: 'SMS' },
                                        ] as const
                                    ).map(({ id, icon: Icon, label }) => (
                                        <label
                                            key={id}
                                            className="flex items-center gap-3 cursor-pointer group"
                                        >
                                            <Checkbox
                                                id={`ch-${id}`}
                                                checked={delivery.channels.includes(id)}
                                                onCheckedChange={() =>
                                                    id !== 'inbox' && toggleChannel(id)
                                                }
                                                disabled={id === 'inbox'}
                                            />
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{label}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Email input */}
                                {delivery.channels.includes('email') && (
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="emailTo"
                                            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                                        >
                                            Send email to
                                        </Label>
                                        <Input
                                            id="emailTo"
                                            type="email"
                                            placeholder="you@yourstore.com"
                                            value={delivery.emailTo ?? ''}
                                            onChange={(e) =>
                                                setDelivery((prev) => ({
                                                    ...prev,
                                                    emailTo: e.target.value,
                                                }))
                                            }
                                            className="h-9"
                                        />
                                    </div>
                                )}

                                {/* SMS input */}
                                {delivery.channels.includes('sms') && (
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="phoneNumber"
                                            className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                                        >
                                            Send SMS to
                                        </Label>
                                        <Input
                                            id="phoneNumber"
                                            type="tel"
                                            placeholder="+1 (555) 000-0000"
                                            value={delivery.phoneNumber ?? ''}
                                            onChange={(e) =>
                                                setDelivery((prev) => ({
                                                    ...prev,
                                                    phoneNumber: e.target.value,
                                                }))
                                            }
                                            className="h-9"
                                        />
                                    </div>
                                )}

                                {/* Report format */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Report Format
                                    </Label>
                                    <RadioGroup
                                        value={delivery.reportFormat ?? 'brief'}
                                        onValueChange={(v) =>
                                            setDelivery((prev) => ({
                                                ...prev,
                                                reportFormat: v as 'brief' | 'detailed',
                                            }))
                                        }
                                        className="space-y-1.5"
                                    >
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <RadioGroupItem value="brief" id="rf-brief" className="mt-0.5" />
                                            <div>
                                                <span className="text-sm font-medium">Brief summary</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Key highlights only — 3–5 bullet points
                                                </p>
                                            </div>
                                        </label>
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <RadioGroupItem value="detailed" id="rf-detailed" className="mt-0.5" />
                                            <div>
                                                <span className="text-sm font-medium">Full detailed breakdown</span>
                                                <p className="text-xs text-muted-foreground">
                                                    Complete analysis with charts and comparisons
                                                </p>
                                            </div>
                                        </label>
                                    </RadioGroup>
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────────────────────── */}
                <SheetFooter className="px-6 py-4 border-t shrink-0 flex gap-3 sm:justify-end">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="flex-1 sm:flex-none"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 sm:flex-none"
                    >
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
