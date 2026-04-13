'use client';

/**
 * Outreach Draft Artifact Card
 *
 * Renders the outreach_draft artifact in the inbox artifact panel.
 * Provides Send Now, Schedule, and Save as Playbook actions inline,
 * so users never have to leave the inbox to action a Craig campaign draft.
 *
 * Phase 1 — Campaign Inbox Fast Path
 */

import React, { useState } from 'react';
import {
    Send,
    Clock,
    BookOpen,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Loader2,
    Mail,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { InboxArtifact } from '@/types/inbox';
import type { OutreachDraftData } from '@/types/inbox';
import { stripHtmlForRendering } from '@/server/security/sanitize';
import {
    sendCampaignFromInbox,
    scheduleCampaignFromInbox,
    convertOutreachToPlaybook,
} from '@/server/actions/campaign-inbox';
import {
    approveAndSendDraft,
    rejectDraft,
} from '@/server/actions/ny-outreach-dashboard';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function segmentLabel(seg: string): string {
    return seg.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ────────────────────────────────────────────────────────────────────────────
// Compliance Banner
// ────────────────────────────────────────────────────────────────────────────

function ComplianceBanner({
    status,
    violations,
    suggestions,
    onOverride,
    isOverriding,
}: {
    status: 'passed' | 'failed' | 'warning';
    violations?: string[];
    suggestions?: string[];
    onOverride?: () => void;
    isOverriding?: boolean;
}) {
    const [showDetails, setShowDetails] = useState(false);

    if (status === 'passed') {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Compliance check passed</span>
            </div>
        );
    }

    return (
        <div className={cn(
            'rounded-md border text-sm',
            status === 'failed'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        )}>
            <div className="flex items-center gap-2 px-3 py-2">
                {status === 'failed'
                    ? <XCircle className="h-4 w-4 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 shrink-0" />}
                <span className="flex-1">
                    {status === 'failed'
                        ? 'Compliance check failed — fix before sending'
                        : 'Compliance warnings — review before sending'}
                </span>
                {violations && violations.length > 0 && (
                    <button
                        className="underline text-xs opacity-70 hover:opacity-100"
                        onClick={() => setShowDetails((v) => !v)}
                    >
                        {showDetails ? 'Hide' : `${violations.length} issue${violations.length !== 1 ? 's' : ''}`}
                    </button>
                )}
            </div>

            {showDetails && violations && violations.length > 0 && (
                <div className="px-3 pb-3 space-y-1">
                    {violations.map((v, i) => (
                        <p key={i} className="text-xs opacity-80">• {v}</p>
                    ))}
                    {suggestions && suggestions.length > 0 && (
                        <>
                            <p className="text-xs font-medium mt-2 opacity-60 uppercase tracking-wide">Suggestions</p>
                            {suggestions.map((s, i) => (
                                <p key={i} className="text-xs opacity-70">↳ {s}</p>
                            ))}
                        </>
                    )}
                </div>
            )}

            {status === 'warning' && onOverride && (
                <div className="px-3 pb-3">
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        onClick={onOverride}
                        disabled={isOverriding}
                    >
                        {isOverriding ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                        Send anyway (override warning)
                    </Button>
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// NY Outreach Draft Sub-Component (approve/reject single lead email)
// ────────────────────────────────────────────────────────────────────────────

function NYOutreachDraftCard({ artifact }: { artifact: InboxArtifact }) {
    const data = artifact.data as OutreachDraftData;
    const [status, setStatus] = useState<'idle' | 'approving' | 'rejecting' | 'sent' | 'rejected' | 'failed'>('idle');
    const [errorMsg, setErrorMsg] = useState<string>();
    const [bodyOpen, setBodyOpen] = useState(false);

    const draftId = data.outreachDraftId!;

    async function handleApprove() {
        setStatus('approving');
        setErrorMsg(undefined);
        try {
            const result = await approveAndSendDraft(draftId);
            if (result.success) {
                setStatus('sent');
            } else {
                setStatus('failed');
                setErrorMsg(result.error || 'Send failed');
            }
        } catch (e) {
            setStatus('failed');
            setErrorMsg((e as Error).message);
        }
    }

    async function handleReject() {
        setStatus('rejecting');
        setErrorMsg(undefined);
        try {
            const result = await rejectDraft(draftId);
            if (result.success) {
                setStatus('rejected');
            } else {
                setErrorMsg(result.error || 'Reject failed');
            }
        } catch (e) {
            setErrorMsg((e as Error).message);
            setStatus('idle');
        }
    }

    if (status === 'sent') {
        return (
            <div className="flex items-center gap-3 px-4 py-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                    <p className="font-semibold text-emerald-400">Email sent via Gmail!</p>
                    <p className="text-sm text-muted-foreground">
                        Sent to {data.outreachLeadName} ({data.outreachLeadEmail})
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'rejected') {
        return (
            <div className="flex items-center gap-3 px-4 py-4 rounded-lg bg-muted border">
                <XCircle className="h-6 w-6 text-muted-foreground shrink-0" />
                <div>
                    <p className="font-semibold text-muted-foreground">Draft rejected</p>
                    <p className="text-sm text-muted-foreground">
                        {data.outreachLeadName} — will not be contacted
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">NY Outreach Draft</h3>
                {data.outreachTemplateId && (
                    <Badge variant="outline" className="ml-auto text-xs">
                        {data.outreachTemplateId.replace(/-/g, ' ')}
                    </Badge>
                )}
            </div>

            {/* Recipient info */}
            <div className="rounded-md border px-3 py-2 bg-muted/50">
                <p className="text-sm font-medium">{data.outreachLeadName}</p>
                <p className="text-xs text-muted-foreground">{data.outreachLeadEmail}</p>
                {data.outreachEmailVerified !== undefined && (
                    <Badge variant="outline" className={cn(
                        'mt-1 text-xs',
                        data.outreachEmailVerified
                            ? 'border-green-300 text-green-700'
                            : 'border-amber-300 text-amber-700'
                    )}>
                        {data.outreachEmailVerified ? 'Email verified' : 'Email unverified'}
                    </Badge>
                )}
            </div>

            {/* Subject */}
            {data.subject && (
                <div className="px-3 py-2 rounded-md bg-muted text-sm">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Subject: </span>
                    {data.subject}
                </div>
            )}

            {/* Body preview */}
            <Collapsible open={bodyOpen} onOpenChange={setBodyOpen}>
                <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between px-3 py-2 rounded-md bg-muted text-sm hover:bg-muted/80 transition-colors">
                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
                            Email body
                        </span>
                        {bodyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    {data.htmlBody ? (
                        <div
                            className="mt-1 px-3 py-2 rounded-md bg-muted/50 text-sm max-h-60 overflow-y-auto prose prose-sm"
                            dangerouslySetInnerHTML={{ __html: stripHtmlForRendering(data.htmlBody) }}
                        />
                    ) : (
                        <div className="mt-1 px-3 py-2 rounded-md bg-muted/50 text-sm whitespace-pre-wrap text-muted-foreground max-h-60 overflow-y-auto">
                            {data.body}
                        </div>
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* Error */}
            {errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            {/* Action buttons */}
            {(status === 'idle' || status === 'failed') && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                        className="gap-1.5 text-xs h-9 bg-green-600 hover:bg-green-700"
                        onClick={handleApprove}
                        disabled={status !== 'idle' && status !== 'failed'}
                    >
                        <Send className="h-3.5 w-3.5" />
                        Approve &amp; Send
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-1.5 text-xs h-9 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleReject}
                        disabled={status !== 'idle' && status !== 'failed'}
                    >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                    </Button>
                </div>
            )}

            {/* Loading states */}
            {status === 'approving' && (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending via Gmail…
                </div>
            )}
            {status === 'rejecting' && (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Rejecting…
                </div>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

interface OutreachDraftCardProps {
    artifact: InboxArtifact;
}

type ActionMode = 'idle' | 'schedule' | 'playbook';

export function OutreachDraftCard({ artifact }: OutreachDraftCardProps) {
    const router = useRouter();
    const data = artifact.data as OutreachDraftData;

    // If this is an NY outreach draft (linked to ny_outreach_drafts), render specialized UI
    if (data.outreachDraftId) {
        return <NYOutreachDraftCard artifact={artifact} />;
    }

    // ── Local UI state ───────────────────────────────────────────────────────
    const [mode, setMode] = useState<ActionMode>('idle');
    const [isSending, setIsSending] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    // Schedule form
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('10:00');
    const [campaignName, setCampaignName] = useState('');

    // Playbook form
    const [playbookName, setPlaybookName] = useState('');
    const [playbookCron, setPlaybookCron] = useState('');
    const [playbookDesc, setPlaybookDesc] = useState('');

    // Result state
    const [sendStatus, setSendStatus] = useState<OutreachDraftData['sendStatus']>(
        data.sendStatus ?? 'idle'
    );
    const [campaignId, setCampaignId] = useState(data.campaignId);
    const [scheduledAtValue, setScheduledAtValue] = useState(data.scheduledAt);
    const [recipientCount, setRecipientCount] = useState(data.recipientCount);
    const [playbookId, setPlaybookId] = useState<string>();
    const [complianceStatus, setComplianceStatus] = useState<'passed' | 'failed' | 'warning' | undefined>(
        data.complianceStatus === 'pending' ? undefined : data.complianceStatus
    );
    const [complianceViolations, setComplianceViolations] = useState(data.complianceViolations);
    const [complianceSuggestions, setComplianceSuggestions] = useState(data.complianceSuggestions);
    const [errorMsg, setErrorMsg] = useState<string>();

    // ── Preview state ────────────────────────────────────────────────────────
    const [bodyOpen, setBodyOpen] = useState(false);

    // ── Handlers ─────────────────────────────────────────────────────────────

    async function handleSendNow(overrideWarning = false) {
        setIsSending(true);
        setErrorMsg(undefined);
        setSendStatus('sending');
        try {
            const result = await sendCampaignFromInbox({
                artifactId: artifact.id,
                campaignName: campaignName || undefined,
                overrideWarning,
            });

            if (result.complianceStatus) setComplianceStatus(result.complianceStatus);
            if (result.complianceViolations) setComplianceViolations(result.complianceViolations);
            if (result.complianceSuggestions) setComplianceSuggestions(result.complianceSuggestions);

            if (result.success) {
                setSendStatus('sent');
                setCampaignId(result.campaignId);
                setRecipientCount(result.recipientCount);
            } else {
                setSendStatus(result.complianceStatus === 'failed' ? 'idle' : 'idle');
                setErrorMsg(result.error);
            }
        } catch (e) {
            setSendStatus('failed');
            setErrorMsg((e as Error).message);
        } finally {
            setIsSending(false);
        }
    }

    async function handleSchedule() {
        if (!scheduleDate) {
            setErrorMsg('Please select a date.');
            return;
        }
        const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
        if (scheduledAt <= new Date()) {
            setErrorMsg('Scheduled time must be in the future.');
            return;
        }

        setIsScheduling(true);
        setErrorMsg(undefined);
        try {
            const result = await scheduleCampaignFromInbox({
                artifactId: artifact.id,
                scheduledAt: scheduledAt.toISOString(),
                campaignName: campaignName || undefined,
                overrideWarning: false,
            });

            if (result.complianceStatus) setComplianceStatus(result.complianceStatus);
            if (result.complianceViolations) setComplianceViolations(result.complianceViolations);

            if (result.success) {
                setSendStatus('scheduled');
                setCampaignId(result.campaignId);
                setScheduledAtValue(result.scheduledAt);
                setMode('idle');
            } else {
                setErrorMsg(result.error);
            }
        } catch (e) {
            setErrorMsg((e as Error).message);
        } finally {
            setIsScheduling(false);
        }
    }

    async function handleConvertToPlaybook() {
        if (!playbookName.trim()) {
            setErrorMsg('Please enter a playbook name.');
            return;
        }
        setIsConverting(true);
        setErrorMsg(undefined);
        try {
            const result = await convertOutreachToPlaybook({
                artifactId: artifact.id,
                playbookName: playbookName.trim(),
                cronSchedule: playbookCron || undefined,
                description: playbookDesc || undefined,
            });

            if (result.success) {
                setPlaybookId(result.playbookId);
                setMode('idle');
            } else {
                setErrorMsg(result.error);
            }
        } catch (e) {
            setErrorMsg((e as Error).message);
        } finally {
            setIsConverting(false);
        }
    }

    // ── Sent / Scheduled confirmation views ─────────────────────────────────

    if (sendStatus === 'sent') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                    <div>
                        <p className="font-semibold text-emerald-400">Campaign sent!</p>
                        {recipientCount !== undefined && (
                            <p className="text-sm text-muted-foreground">
                                Delivered to {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>
                </div>
                {campaignId && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => router.push('/dashboard/campaigns')}
                    >
                        <ExternalLink className="h-4 w-4" />
                        View in Campaigns
                    </Button>
                )}
            </div>
        );
    }

    if (sendStatus === 'scheduled') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-4 py-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <CalendarClock className="h-6 w-6 text-blue-400 shrink-0" />
                    <div>
                        <p className="font-semibold text-blue-400">Campaign scheduled</p>
                        {scheduledAtValue && (
                            <p className="text-sm text-muted-foreground">
                                Sends {new Date(scheduledAtValue).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
                {campaignId && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => router.push('/dashboard/campaigns')}
                    >
                        <ExternalLink className="h-4 w-4" />
                        View in Campaigns
                    </Button>
                )}
            </div>
        );
    }

    // ── Main draft view ──────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Email Draft</h3>
                <Badge variant="outline" className="ml-auto text-xs capitalize">
                    {data.channel}
                </Badge>
            </div>

            {/* Subject */}
            {data.subject && (
                <div className="px-3 py-2 rounded-md bg-muted text-sm">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Subject: </span>
                    {data.subject}
                </div>
            )}

            {/* Body preview (collapsible) */}
            <Collapsible open={bodyOpen} onOpenChange={setBodyOpen}>
                <CollapsibleTrigger asChild>
                    <button className="flex w-full items-center justify-between px-3 py-2 rounded-md bg-muted text-sm hover:bg-muted/80 transition-colors">
                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">
                            Message body
                        </span>
                        {bodyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="mt-1 px-3 py-2 rounded-md bg-muted/50 text-sm whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto">
                        {data.body}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Audience */}
            {data.targetSegments && data.targetSegments.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                        <span className="font-medium text-foreground">Audience: </span>
                        {data.targetSegments.map(segmentLabel).join(', ')}
                        {data.estimatedRecipients !== undefined && (
                            <span className="ml-1 opacity-60">(~{data.estimatedRecipients} recipients)</span>
                        )}
                    </div>
                </div>
            )}

            {/* Compliance banner */}
            {complianceStatus && (
                <ComplianceBanner
                    status={complianceStatus}
                    violations={complianceViolations}
                    suggestions={complianceSuggestions}
                    onOverride={complianceStatus === 'warning' ? () => handleSendNow(true) : undefined}
                    isOverriding={isSending}
                />
            )}

            {/* Error message */}
            {errorMsg && !complianceViolations?.length && (
                <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            {/* Playbook saved confirmation */}
            {playbookId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>Saved as playbook!</span>
                    <Button
                        variant="link"
                        size="sm"
                        className="ml-auto text-purple-400 h-auto p-0 text-xs"
                        onClick={() => router.push('/dashboard/playbooks')}
                    >
                        View <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                </div>
            )}

            {/* Optional campaign name */}
            {mode === 'idle' && (
                <div className="space-y-1">
                    <Label htmlFor="campaign-name" className="text-xs text-muted-foreground">
                        Campaign name (optional)
                    </Label>
                    <Input
                        id="campaign-name"
                        placeholder="e.g. Spring Promo — VIP list"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="h-8 text-sm"
                    />
                </div>
            )}

            {/* ── Action bar ── */}
            {mode === 'idle' && sendStatus !== 'sending' && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* Send Now */}
                    <Button
                        className="gap-1.5 text-xs h-9"
                        onClick={() => handleSendNow(false)}
                        disabled={isSending || complianceStatus === 'failed'}
                    >
                        {isSending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Send className="h-3.5 w-3.5" />
                        )}
                        {isSending ? 'Sending…' : 'Send Now'}
                    </Button>

                    {/* Schedule */}
                    <Button
                        variant="outline"
                        className="gap-1.5 text-xs h-9"
                        onClick={() => setMode('schedule')}
                        disabled={isSending || complianceStatus === 'failed'}
                    >
                        <Clock className="h-3.5 w-3.5" />
                        Schedule
                    </Button>

                    {/* Save as Playbook */}
                    <Button
                        variant="outline"
                        className="gap-1.5 text-xs h-9"
                        onClick={() => setMode('playbook')}
                        disabled={isSending}
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        Playbook
                    </Button>
                </div>
            )}

            {/* Sending spinner */}
            {sendStatus === 'sending' && (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending to recipients…
                </div>
            )}

            {/* ── Schedule form ── */}
            {mode === 'schedule' && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                    <p className="text-sm font-medium">Schedule send</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Date</Label>
                            <Input
                                type="date"
                                value={scheduleDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setScheduleDate(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Time</Label>
                            <Input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                    {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1 gap-1.5 text-xs h-8"
                            onClick={handleSchedule}
                            disabled={isScheduling}
                        >
                            {isScheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarClock className="h-3 w-3" />}
                            {isScheduling ? 'Scheduling…' : 'Confirm Schedule'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8"
                            onClick={() => { setMode('idle'); setErrorMsg(undefined); }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* ── Convert to Playbook form ── */}
            {mode === 'playbook' && (
                <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                    <p className="text-sm font-medium">Save as repeating playbook</p>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Playbook name *</Label>
                        <Input
                            placeholder="e.g. Weekly VIP Email"
                            value={playbookName}
                            onChange={(e) => setPlaybookName(e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                            Cron schedule (optional — leave blank for manual trigger)
                        </Label>
                        <Input
                            placeholder="0 10 * * 1  (Mondays 10am)"
                            value={playbookCron}
                            onChange={(e) => setPlaybookCron(e.target.value)}
                            className="h-8 text-sm font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                        <Input
                            placeholder="What does this playbook do?"
                            value={playbookDesc}
                            onChange={(e) => setPlaybookDesc(e.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1 gap-1.5 text-xs h-8"
                            onClick={handleConvertToPlaybook}
                            disabled={isConverting}
                        >
                            {isConverting ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookOpen className="h-3 w-3" />}
                            {isConverting ? 'Saving…' : 'Save Playbook'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8"
                            onClick={() => { setMode('idle'); setErrorMsg(undefined); }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
