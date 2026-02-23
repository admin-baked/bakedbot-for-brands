'use client';

/**
 * TriggerEditorPanel
 *
 * Zapier-like trigger configurator. Renders a tabbed UI:
 *   Scheduled → frequency preset (Daily/Weekly/Monthly) + time picker + timezone
 *   Event-Driven → categorized event dropdown
 *   Manual → info badge only
 *
 * Works with the PlaybookTrigger type from src/types/playbook.ts.
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PlaybookTrigger } from '@/types/playbook';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Clock, Zap, MousePointer } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const MINUTES = ['00', '15', '30', '45'] as const;
type MinuteStr = typeof MINUTES[number];

const COMMON_TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern (ET)' },
    { value: 'America/Chicago', label: 'Central (CT)' },
    { value: 'America/Denver', label: 'Mountain (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
];

const EVENT_OPTION_GROUPS = [
    {
        group: 'Customer Lifecycle',
        events: [
            { value: 'customer.signup', label: 'Customer signs up' },
            { value: 'customer.birthday', label: "Customer's birthday" },
            { value: 'customer.30_day_inactive', label: 'Customer inactive 30 days' },
            { value: 'order.post_purchase', label: 'After a purchase' },
        ],
    },
    {
        group: 'Menu & Inventory',
        events: [
            { value: 'menu.import_complete', label: 'Menu import complete' },
            { value: 'inventory.new_product', label: 'New product added' },
            { value: 'inventory.low_stock', label: 'Low stock detected' },
        ],
    },
    {
        group: 'Competitive',
        events: [
            { value: 'competitor.price_change', label: 'Competitor price change' },
            { value: 'competitor.menu_shakeup', label: 'Competitor menu change' },
        ],
    },
    {
        group: 'Compliance',
        events: [
            { value: 'campaign.pre_send', label: 'Before campaign sends' },
            { value: 'compliance.jurisdiction_change', label: 'Jurisdiction regulation change' },
        ],
    },
    {
        group: 'System',
        events: [
            { value: 'owner.day3', label: 'Day 3 after owner signup' },
            { value: 'usage.at_80_percent', label: '80% usage threshold reached' },
            { value: 'usage.feature_ceiling', label: 'Feature ceiling reached' },
            { value: 'billing.new_empire_signup', label: 'New Empire plan signup' },
        ],
    },
];

// ── Cron helpers ──────────────────────────────────────────────────────────────

export interface ScheduleState {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek: number;   // 1=Mon … 7=Sun
    monthDay: number;    // 1–28
    hour: number;        // 1–12
    minute: MinuteStr;
    ampm: 'am' | 'pm';
}

/** Convert a cron expression to the UI schedule state. */
export function parseCron(cron: string): ScheduleState {
    const defaults: ScheduleState = {
        frequency: 'daily', dayOfWeek: 1, monthDay: 1,
        hour: 7, minute: '00', ampm: 'am',
    };

    try {
        const parts = cron.trim().split(/\s+/);
        if (parts.length < 5) return defaults;

        const [minPart, hrPart, domPart, , dowPart] = parts;
        const hour24 = parseInt(hrPart, 10);
        const minuteNum = parseInt(minPart, 10);

        const ampm: 'am' | 'pm' = hour24 >= 12 ? 'pm' : 'am';
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
        const minutePadded = String(minuteNum).padStart(2, '0');
        const minute = (MINUTES as readonly string[]).includes(minutePadded)
            ? (minutePadded as MinuteStr)
            : '00';

        let frequency: ScheduleState['frequency'] = 'daily';
        let dayOfWeek = 1;
        let monthDay = 1;

        if (domPart !== '*' && dowPart === '*') {
            frequency = 'monthly';
            monthDay = Math.max(1, Math.min(28, parseInt(domPart, 10)));
        } else if (dowPart !== '*') {
            frequency = 'weekly';
            const dow = parseInt(dowPart, 10);
            dayOfWeek = dow === 0 ? 7 : dow; // cron 0=Sun → UI 7=Sun
        }

        return { frequency, dayOfWeek, monthDay, hour: hour12, minute, ampm };
    } catch {
        return defaults;
    }
}

/** Build a cron expression from the UI schedule state. */
export function buildCron(s: ScheduleState): string {
    let hour24 = s.hour % 12;
    if (s.ampm === 'pm') hour24 += 12;
    const minute = parseInt(s.minute, 10);

    if (s.frequency === 'daily') return `${minute} ${hour24} * * *`;
    if (s.frequency === 'weekly') {
        const dow = s.dayOfWeek === 7 ? 0 : s.dayOfWeek; // UI 7=Sun → cron 0
        return `${minute} ${hour24} * * ${dow}`;
    }
    return `${minute} ${hour24} ${s.monthDay} * *`;
}

/** Human-readable description of a schedule. */
export function describeSchedule(s: ScheduleState, timezone: string): string {
    const tzLabel =
        COMMON_TIMEZONES.find((t) => t.value === timezone)?.label?.split(' ')[0] ?? 'Local';
    const timeStr = `${s.hour}:${s.minute} ${s.ampm.toUpperCase()}`;

    if (s.frequency === 'daily') return `Every day at ${timeStr} ${tzLabel}`;
    if (s.frequency === 'weekly') return `Every ${DAYS[s.dayOfWeek - 1]} at ${timeStr} ${tzLabel}`;

    const nth = (n: number) =>
        n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
    return `${nth(s.monthDay)} of each month at ${timeStr} ${tzLabel}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface TriggerEditorPanelProps {
    trigger: PlaybookTrigger;
    onChange: (trigger: PlaybookTrigger) => void;
}

export function TriggerEditorPanel({ trigger, onChange }: TriggerEditorPanelProps) {
    const mode =
        trigger.type === 'schedule' ? 'scheduled'
            : trigger.type === 'event' ? 'event'
                : 'manual';

    const [schedule, setSchedule] = useState<ScheduleState>(
        parseCron(trigger.cron ?? '0 7 * * *')
    );
    const [timezone, setTimezone] = useState(trigger.timezone ?? 'America/New_York');
    const [eventName, setEventName] = useState(trigger.eventName ?? 'customer.signup');

    const preview = describeSchedule(schedule, timezone);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const emitSchedule = (nextSchedule: ScheduleState, nextTz: string) => {
        onChange({
            ...trigger,
            type: 'schedule',
            cron: buildCron(nextSchedule),
            timezone: nextTz,
        });
    };

    const handleScheduleChange = (patch: Partial<ScheduleState>) => {
        const next = { ...schedule, ...patch };
        setSchedule(next);
        emitSchedule(next, timezone);
    };

    const handleTimezoneChange = (tz: string) => {
        setTimezone(tz);
        emitSchedule(schedule, tz);
    };

    const handleEventChange = (evt: string) => {
        setEventName(evt);
        onChange({ type: 'event', eventName: evt });
    };

    const handleModeChange = (m: string) => {
        if (m === 'scheduled') {
            onChange({ type: 'schedule', cron: buildCron(schedule), timezone });
        } else if (m === 'event') {
            onChange({ type: 'event', eventName });
        } else {
            onChange({ type: 'manual' });
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Tabs value={mode} onValueChange={handleModeChange}>
            {/* Mode tabs */}
            <TabsList className="w-full grid grid-cols-3 h-9">
                <TabsTrigger value="scheduled" className="text-xs gap-1.5">
                    <Clock className="h-3 w-3" />
                    Scheduled
                </TabsTrigger>
                <TabsTrigger value="event" className="text-xs gap-1.5">
                    <Zap className="h-3 w-3" />
                    Event-Driven
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-xs gap-1.5">
                    <MousePointer className="h-3 w-3" />
                    Manual
                </TabsTrigger>
            </TabsList>

            {/* ── Scheduled ─────────────────────────────────────────────────── */}
            <TabsContent value="scheduled" className="pt-4 space-y-4">
                {/* Frequency */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Frequency
                    </Label>
                    <div className="flex gap-2">
                        {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                            <button
                                key={freq}
                                type="button"
                                onClick={() => handleScheduleChange({ frequency: freq })}
                                className={cn(
                                    'flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors',
                                    schedule.frequency === freq
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                )}
                            >
                                {freq.charAt(0).toUpperCase() + freq.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Day of week — weekly only */}
                {schedule.frequency === 'weekly' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Day
                        </Label>
                        <Select
                            value={String(schedule.dayOfWeek)}
                            onValueChange={(v) => handleScheduleChange({ dayOfWeek: parseInt(v, 10) })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS.map((day, i) => (
                                    <SelectItem key={day} value={String(i + 1)}>
                                        {day}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Day of month — monthly only */}
                {schedule.frequency === 'monthly' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Day of Month
                        </Label>
                        <Select
                            value={String(schedule.monthDay)}
                            onValueChange={(v) => handleScheduleChange({ monthDay: parseInt(v, 10) })}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => {
                                    const suffix =
                                        d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
                                    return (
                                        <SelectItem key={d} value={String(d)}>
                                            {d}{suffix}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Time */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Time
                    </Label>
                    <div className="flex gap-2">
                        {/* Hour */}
                        <Select
                            value={String(schedule.hour)}
                            onValueChange={(v) => handleScheduleChange({ hour: parseInt(v, 10) })}
                        >
                            <SelectTrigger className="h-9 flex-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {HOURS_12.map((h) => (
                                    <SelectItem key={h} value={String(h)}>
                                        {h}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Minute */}
                        <Select
                            value={schedule.minute}
                            onValueChange={(v) => handleScheduleChange({ minute: v as MinuteStr })}
                        >
                            <SelectTrigger className="h-9 w-[72px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {MINUTES.map((m) => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* AM/PM */}
                        <Select
                            value={schedule.ampm}
                            onValueChange={(v) =>
                                handleScheduleChange({ ampm: v as 'am' | 'pm' })
                            }
                        >
                            <SelectTrigger className="h-9 w-[72px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="am">AM</SelectItem>
                                <SelectItem value="pm">PM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Timezone
                    </Label>
                    <Select value={timezone} onValueChange={handleTimezoneChange}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COMMON_TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                    {tz.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Human-readable preview */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border border-border/50">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{preview}</span>
                </div>
            </TabsContent>

            {/* ── Event-Driven ───────────────────────────────────────────────── */}
            <TabsContent value="event" className="pt-4 space-y-4">
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Trigger Event
                    </Label>
                    <Select value={eventName} onValueChange={handleEventChange}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {EVENT_OPTION_GROUPS.map((group) => (
                                <React.Fragment key={group.group}>
                                    <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        {group.group}
                                    </div>
                                    {group.events.map((evt) => (
                                        <SelectItem key={evt.value} value={evt.value} className="pl-4">
                                            {evt.label}
                                        </SelectItem>
                                    ))}
                                </React.Fragment>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border border-border/50">
                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-sm font-medium">Fires within 5 minutes of the event</span>
                </div>
            </TabsContent>

            {/* ── Manual ─────────────────────────────────────────────────────── */}
            <TabsContent value="manual" className="pt-4">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/50 rounded-lg border border-border/50">
                    <MousePointer className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">
                        Run manually from the dashboard whenever you choose.
                    </span>
                </div>
            </TabsContent>
        </Tabs>
    );
}
