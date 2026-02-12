'use client';

import { useState } from 'react';
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
    Mail, MessageSquare, Users,
} from 'lucide-react';
import { createCampaign } from '@/server/actions/campaigns';
import {
    CAMPAIGN_GOALS, type CampaignGoal, type CampaignChannel,
} from '@/types/campaign';
import type { CustomerSegment } from '@/types/customers';
import { getSegmentInfo } from '@/types/customers';

const SEGMENT_OPTIONS: CustomerSegment[] = [
    'vip', 'loyal', 'frequent', 'high_value', 'new', 'slipping', 'at_risk', 'churned',
];

const STEPS = ['Goal', 'Audience', 'Content', 'Review'] as const;

interface CampaignWizardV2Props {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function CampaignWizardV2({ open, onClose, onCreated }: CampaignWizardV2Props) {
    const [step, setStep] = useState(0);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [goal, setGoal] = useState<CampaignGoal | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [channels, setChannels] = useState<CampaignChannel[]>(['email']);
    const [segments, setSegments] = useState<CustomerSegment[]>([]);
    const [audienceType, setAudienceType] = useState<'all' | 'segment'>('segment');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [smsBody, setSmsBody] = useState('');

    const goalInfo = goal ? CAMPAIGN_GOALS.find(g => g.id === goal) : null;

    const canNext = () => {
        switch (step) {
            case 0: return !!goal && !!name.trim();
            case 1: return audienceType === 'all' || segments.length > 0;
            case 2: {
                if (channels.includes('email') && !emailSubject.trim()) return false;
                if (channels.includes('email') && !emailBody.trim()) return false;
                if (channels.includes('sms') && !smsBody.trim()) return false;
                return true;
            }
            case 3: return true;
            default: return false;
        }
    };

    const toggleChannel = (ch: CampaignChannel) => {
        setChannels(prev =>
            prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
        );
    };

    const toggleSegment = (seg: CustomerSegment) => {
        setSegments(prev =>
            prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]
        );
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
                    htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<p>${emailBody.replace(/\n/g, '<br>')}</p>
</div>`,
                };
            }
            if (channels.includes('sms')) {
                content.sms = {
                    channel: 'sms',
                    body: smsBody,
                };
            }

            const campaign = await createCampaign({
                orgId: '', // resolved server-side
                createdBy: '', // resolved server-side
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

                {/* Progress bar */}
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

                {/* Step 0: Goal */}
                {step === 0 && (
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
                                            // Auto-suggest channels and segments
                                            setChannels(g.suggestedChannels);
                                            setSegments(g.suggestedSegments);
                                        }}
                                    >
                                        <CardContent className="p-3">
                                            <p className="font-medium text-sm">{g.label}</p>
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

                {/* Step 1: Audience */}
                {step === 1 && (
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
                                <Label>Select Segments</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {SEGMENT_OPTIONS.map(seg => {
                                        const info = getSegmentInfo(seg);
                                        const selected = segments.includes(seg);
                                        return (
                                            <Card
                                                key={seg}
                                                className={`cursor-pointer transition-colors ${
                                                    selected ? 'border-primary bg-primary/5' : 'hover:border-primary/30'
                                                }`}
                                                onClick={() => toggleSegment(seg)}
                                            >
                                                <CardContent className="p-3 flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${info.color}`} />
                                                    <div>
                                                        <p className="font-medium text-sm">{info.label}</p>
                                                        <p className="text-xs text-muted-foreground">{info.description}</p>
                                                    </div>
                                                    {selected && <Check className="h-4 w-4 text-primary ml-auto" />}
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

                {/* Step 2: Content */}
                {step === 2 && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Use variables like {'{{firstName}}'}, {'{{segment}}'}, {'{{totalSpent}}'} for personalization.
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
                                <p className="text-xs text-muted-foreground">
                                    {smsBody.length}/160 characters
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Review */}
                {step === 3 && (
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
                                <div className="flex gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        {audienceType === 'all'
                                            ? 'All customers'
                                            : `${segments.map(s => getSegmentInfo(s).label).join(', ')}`
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
                                    <div className="border-t pt-2">
                                        <p className="text-xs font-medium text-muted-foreground">EMAIL</p>
                                        <p className="text-sm font-medium">{emailSubject}</p>
                                        <p className="text-sm text-muted-foreground whitespace-pre-line">{emailBody}</p>
                                    </div>
                                )}

                                {channels.includes('sms') && (
                                    <div className="border-t pt-2">
                                        <p className="text-xs font-medium text-muted-foreground">SMS</p>
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
                            Campaign will be saved as a draft. You can submit it for compliance review and schedule it from the campaign detail page.
                        </p>
                    </div>
                )}

                {/* Navigation */}
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
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Campaign'
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
