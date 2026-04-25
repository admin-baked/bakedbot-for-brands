'use client';

import { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Check, ChevronLeft, ChevronRight, Loader2,
    Mail, MessageSquare, Users, Sparkles, PenLine, Package,
} from 'lucide-react';
import { createCampaign } from '@/server/actions/campaigns';
import {
    CAMPAIGN_GOALS, type CampaignGoal, type CampaignChannel,
} from '@/types/campaign';
import type { CustomerSegment } from '@/types/customers';
import { getSegmentInfo } from '@/types/customers';
import { generateCampaignFromNL } from '@/server/actions/campaign-nlp';
import type { SegmentCounts } from '@/server/actions/campaigns';

// Context injected when launching from a specific surface (e.g. Slow Mover panel)
export interface WizardContext {
    mode: 'slow-mover' | 'general';
    presetName?: string;
    presetGoal?: CampaignGoal;
    presetChannels?: CampaignChannel[];
    /** Pre-written AI prompt — shown in the AI tab, ready to generate */
    aiPrompt?: string;
    /** Human-readable hint shown at the top of the wizard */
    note?: string;
}

const SEGMENT_OPTIONS: CustomerSegment[] = [
    'vip', 'loyal', 'frequent', 'high_value', 'new', 'slipping', 'at_risk', 'churned',
];

const STEPS = ['Goal', 'Audience', 'Content', 'Review'] as const;

interface CampaignWizardV2Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
    context?: WizardContext;
    segmentCounts?: SegmentCounts;
}

export function CampaignWizardV2({ open, onClose, onCreated, context, segmentCounts }: CampaignWizardV2Props) {
    const [step, setStep] = useState(0);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AI mode: default to AI when context has a pre-filled prompt
    const [wizardMode, setWizardMode] = useState<'manual' | 'ai'>(
        context?.aiPrompt ? 'ai' : 'manual'
    );
    const [nlPrompt, setNlPrompt] = useState(context?.aiPrompt ?? '');
    const [generating, setGenerating] = useState(false);
    const [nlError, setNlError] = useState<string | null>(null);

    // Form state — seeded from context
    const [goal, setGoal] = useState<CampaignGoal | null>(context?.presetGoal ?? null);
    const [name, setName] = useState(context?.presetName ?? '');
    const [description, setDescription] = useState('');
    const [channels, setChannels] = useState<CampaignChannel[]>(context?.presetChannels ?? ['email']);
    const [segments, setSegments] = useState<CustomerSegment[]>([]);
    const [audienceType, setAudienceType] = useState<'all' | 'segment'>('segment');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [smsBody, setSmsBody] = useState('');

    // Re-seed when context changes (e.g. different "Move It" click)
    useEffect(() => {
        if (!open) return;
        setStep(0);
        setError(null);
        setNlError(null);
        setCreating(false);
        setGenerating(false);
        setWizardMode(context?.aiPrompt ? 'ai' : 'manual');
        setNlPrompt(context?.aiPrompt ?? '');
        setGoal(context?.presetGoal ?? null);
        setName(context?.presetName ?? '');
        setDescription('');
        setChannels(context?.presetChannels ?? ['email']);
        setSegments([]);
        setAudienceType('segment');
        setEmailSubject('');
        setEmailBody('');
        setSmsBody('');
    }, [open, context]);

    const goalInfo = goal ? CAMPAIGN_GOALS.find(g => g.id === goal) : null;

    const canNext = () => {
        switch (step) {
            case 0: return !!goal && !!name.trim();
            case 1: return audienceType === 'all' || segments.length > 0;
            case 2: {
                if (channels.includes('email') && (!emailSubject.trim() || !emailBody.trim())) return false;
                if (channels.includes('sms') && !smsBody.trim()) return false;
                return true;
            }
            case 3: return true;
            default: return false;
        }
    };

    const toggleChannel = (ch: CampaignChannel) =>
        setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);

    const toggleSegment = (seg: CustomerSegment) =>
        setSegments(prev => prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]);

    // Shared: call Craig, apply result, jump to Review
    const runGenerate = async (prompt: string, preserveExisting = false) => {
        setGenerating(true);
        setNlError(null);
        try {
            const result = await generateCampaignFromNL(prompt);
            if (!result.success) { setNlError(result.error); return false; }
            const d = result.data;
            setName(prev => (preserveExisting && prev) ? prev : d.name);
            setDescription(d.description);
            setGoal(prev => (preserveExisting && prev) ? prev : d.goal);
            setChannels(d.channels);
            setSegments(d.targetSegments);
            setAudienceType(d.audienceType);
            setEmailSubject(d.emailSubject);
            setEmailBody(d.emailBody);
            setSmsBody(d.smsBody);
            setWizardMode('manual');
            setStep(3);
            return true;
        } catch (err) {
            setNlError(err instanceof Error ? err.message : 'An error occurred');
            return false;
        } finally {
            setGenerating(false);
        }
    };

    const handleGenerate = async () => {
        if (!nlPrompt.trim()) return;
        await runGenerate(nlPrompt);
    };

    // Content step shortcut — picks up the context prompt or whatever the user typed
    const handleWriteWithCraig = async () => {
        const prompt = nlPrompt.trim() || context?.aiPrompt?.trim() || '';
        if (!prompt) return;
        setNlPrompt(prompt);
        setWizardMode('ai');
        const ok = await runGenerate(prompt, true);
        if (!ok) setWizardMode('manual');
    };

    const handleCreate = async () => {
        if (!goal) return;
        setCreating(true);
        setError(null);
        try {
            const content: Record<string, unknown> = {};
            if (channels.includes('email')) {
                content.email = {
                    channel: 'email',
                    subject: emailSubject,
                    body: emailBody,
                    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;"><p>${emailBody.replace(/\n/g, '<br>')}</p></div>`,
                };
            }
            if (channels.includes('sms')) {
                content.sms = { channel: 'sms', body: smsBody };
            }
            const campaign = await createCampaign({
                orgId: '',
                createdBy: '',
                name,
                description,
                goal,
                channels,
                audience: {
                    type: audienceType,
                    segments: audienceType === 'segment' ? segments : undefined,
                    estimatedCount: 0,
                },
                content: content as Record<CampaignChannel, { channel: CampaignChannel; subject?: string; body: string; htmlBody?: string }>,
            });
            if (campaign) {
                onCreated();
            } else {
                setError('Failed to create campaign. Please try again.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>New Campaign</DialogTitle>
                </DialogHeader>

                {/* Context note — shown when launched from a specific surface */}
                {context?.note && (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 mb-2">
                        <Package className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>{context.note}</span>
                    </div>
                )}

                {/* Mode switcher */}
                <div className="flex items-center gap-2 mb-4 border rounded-lg p-1 bg-muted/40 w-fit">
                    <Button
                        variant={wizardMode === 'manual' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 gap-1.5"
                        onClick={() => setWizardMode('manual')}
                    >
                        <PenLine className="h-3.5 w-3.5" /> Manual
                    </Button>
                    <Button
                        variant={wizardMode === 'ai' ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 gap-1.5"
                        onClick={() => setWizardMode('ai')}
                    >
                        <Sparkles className="h-3.5 w-3.5" /> Craig AI
                    </Button>
                </div>

                {/* AI mode panel */}
                {wizardMode === 'ai' && (
                    <div className="space-y-4 mb-4">
                        <div>
                            <Label htmlFor="nl-prompt">Tell Craig what to write</Label>
                            <Textarea
                                id="nl-prompt"
                                placeholder="e.g. Flash sale email to move slow inventory — 20% off this weekend only"
                                value={nlPrompt}
                                onChange={(e) => setNlPrompt(e.target.value)}
                                rows={5}
                                className="mt-1 font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Craig will write the subject, body, and SMS — all cannabis-compliant.
                            </p>
                        </div>
                        {nlError && (
                            <Alert variant="destructive">
                                <AlertDescription>{nlError}</AlertDescription>
                            </Alert>
                        )}
                        <Button
                            onClick={handleGenerate}
                            disabled={generating || !nlPrompt.trim()}
                            className="w-full gap-2"
                            size="lg"
                        >
                            {generating ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Craig is writing…</>
                            ) : (
                                <><Sparkles className="h-4 w-4" /> Generate Campaign</>
                            )}
                        </Button>
                    </div>
                )}

                {/* Step progress — manual mode only */}
                {wizardMode === 'manual' && (
                    <div className="flex items-center gap-2 mb-4">
                        {STEPS.map((s, i) => (
                            <div key={s} className="flex items-center gap-2 flex-1">
                                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                                    i < step ? 'bg-green-500 text-white' :
                                    i === step ? 'bg-primary text-primary-foreground' :
                                    'bg-muted text-muted-foreground'
                                }`}>
                                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                </div>
                                <span className={`text-sm hidden sm:inline ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>
                                    {s}
                                </span>
                                {i < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-500' : 'bg-muted'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Step 0: Goal ─────────────────────────────────────────── */}
                {wizardMode === 'manual' && step === 0 && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="campaign-name">Campaign Name</Label>
                            <Input
                                id="campaign-name"
                                placeholder="e.g., VIP Winter Special"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="campaign-desc">Description (optional)</Label>
                            <Input
                                id="campaign-desc"
                                placeholder="Brief description of this campaign"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label>Campaign Goal</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {CAMPAIGN_GOALS.map(g => (
                                    <Card
                                        key={g.id}
                                        className={`cursor-pointer transition-colors ${
                                            goal === g.id
                                                ? 'border-primary bg-primary/5'
                                                : 'hover:border-primary/30'
                                        }`}
                                        onClick={() => {
                                            setGoal(g.id);
                                            setChannels(g.suggestedChannels);
                                            setSegments(g.suggestedSegments);
                                        }}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="font-medium text-sm">{g.label}</p>
                                                {goal === g.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{g.description}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label>Channels</Label>
                            <div className="flex gap-2 mt-2">
                                <Badge
                                    variant={channels.includes('email') ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => toggleChannel('email')}
                                >
                                    <Mail className="h-3 w-3 mr-1" /> Email
                                </Badge>
                                <Badge
                                    variant={channels.includes('sms') ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => toggleChannel('sms')}
                                >
                                    <MessageSquare className="h-3 w-3 mr-1" /> SMS
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 1: Audience ─────────────────────────────────────── */}
                {wizardMode === 'manual' && step === 1 && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Badge
                                variant={audienceType === 'all' ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setAudienceType('all')}
                            >
                                All Customers
                            </Badge>
                            <Badge
                                variant={audienceType === 'segment' ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => setAudienceType('segment')}
                            >
                                By Segment
                            </Badge>
                        </div>

                        {audienceType === 'segment' && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Select Segments</Label>
                                    {segments.length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                            {segments.reduce((sum, s) => sum + (segmentCounts?.[s] ?? 0), 0).toLocaleString()} customers selected
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {SEGMENT_OPTIONS.map(seg => {
                                        const info = getSegmentInfo(seg);
                                        const selected = segments.includes(seg);
                                        const count = segmentCounts?.[seg];
                                        return (
                                            <Card
                                                key={seg}
                                                className={`cursor-pointer transition-colors ${
                                                    selected ? 'border-primary bg-primary/5' : 'hover:border-primary/30'
                                                } ${count === 0 ? 'opacity-50' : ''}`}
                                                onClick={() => count !== 0 && toggleSegment(seg)}
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex items-start gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${info.color}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className="font-medium text-sm">{info.label}</p>
                                                                {count !== undefined ? (
                                                                    <span className={`text-xs font-medium shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                                                                        {count.toLocaleString()}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground truncate">{info.description}</p>
                                                        </div>
                                                        {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {goalInfo && segments.length === 0 && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Suggested: {goalInfo.suggestedSegments.map(s => getSegmentInfo(s).label).join(', ')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Step 2: Content ──────────────────────────────────────── */}
                {wizardMode === 'manual' && step === 2 && (
                    <div className="space-y-4">
                        {/* Craig shortcut — always visible at top of content step */}
                        <button
                            type="button"
                            onClick={handleWriteWithCraig}
                            disabled={generating}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                        >
                            {generating ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Craig is writing…</>
                            ) : (
                                <><Sparkles className="h-4 w-4" /> Write with Craig — fills everything automatically</>
                            )}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-x-0 top-1/2 flex items-center">
                                <div className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-background px-2 text-muted-foreground">or write it yourself</span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Use <code className="bg-muted px-1 rounded">{'{{firstName}}'}</code>, <code className="bg-muted px-1 rounded">{'{{segment}}'}</code>, <code className="bg-muted px-1 rounded">{'{{totalSpent}}'}</code> for personalization.
                        </p>

                        {channels.includes('email') && (
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> Email Content
                                </Label>
                                <Input
                                    placeholder="Email subject line"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                />
                                <Textarea
                                    placeholder="Email body (plain text, supports {{variables}})"
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    rows={6}
                                />
                            </div>
                        )}

                        {channels.includes('sms') && (
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <MessageSquare className="h-4 w-4" /> SMS Content
                                </Label>
                                <Textarea
                                    placeholder="SMS message (160 chars recommended)"
                                    value={smsBody}
                                    onChange={(e) => setSmsBody(e.target.value)}
                                    rows={3}
                                />
                                <p className="text-xs text-muted-foreground">{smsBody.length}/160 characters</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Step 3: Review ───────────────────────────────────────── */}
                {wizardMode === 'manual' && step === 3 && (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">{name}</h3>
                                    <Badge variant="outline">{goalInfo?.label}</Badge>
                                </div>
                                {description && (
                                    <p className="text-sm text-muted-foreground">{description}</p>
                                )}
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {audienceType === 'all'
                                            ? 'All customers'
                                            : segments.map(s => {
                                                const c = segmentCounts?.[s];
                                                return c !== undefined
                                                    ? `${getSegmentInfo(s).label} (${c.toLocaleString()})`
                                                    : getSegmentInfo(s).label;
                                            }).join(', ')
                                        }
                                    </span>
                                    <span className="flex items-center gap-1">
                                        {channels.map(ch => (
                                            ch === 'email'
                                                ? <Mail key={ch} className="h-3.5 w-3.5" />
                                                : <MessageSquare key={ch} className="h-3.5 w-3.5" />
                                        ))}
                                        {channels.join(' + ').toUpperCase()}
                                    </span>
                                </div>

                                {channels.includes('email') && (
                                    <div className="border-t pt-3">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                                        <p className="text-sm font-medium">{emailSubject}</p>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">{emailBody}</p>
                                    </div>
                                )}

                                {channels.includes('sms') && (
                                    <div className="border-t pt-3">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">SMS</p>
                                        <p className="text-sm text-muted-foreground">{smsBody}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <p className="text-sm text-muted-foreground">
                            Saved as a draft. Submit for compliance review and schedule it from the campaign detail page.
                        </p>
                    </div>
                )}

                {/* Navigation — manual mode only */}
                {wizardMode === 'manual' && (
                    <div className="flex justify-between mt-4 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            {step > 0 ? 'Back' : 'Cancel'}
                        </Button>

                        {step < STEPS.length - 1 ? (
                            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button onClick={handleCreate} disabled={creating || !canNext()}>
                                {creating ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</>
                                ) : (
                                    'Create Campaign'
                                )}
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
