'use client';

/**
 * ResearchGeneratorSheet
 *
 * 3-step research-enriched blog creation:
 *   Step 1 — Research  (Jina search → key findings)
 *   Step 2 — Brief     (review/edit synthesized brief)
 *   Step 3 — Generated (post created, link to editor)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, FileText, ArrowRight, CheckCircle, X, RefreshCw } from 'lucide-react';
import {
    generateResearchBrief,
    researchAndGenerateBlog,
} from '@/server/actions/blog-research';
import type { ResearchBrief } from '@/server/actions/action-types';
import type { BlogCategory, BlogContentType } from '@/types/blog';

interface ResearchGeneratorSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultMode?: BlogContentType;
    seedTopic?: string;
    orgId: string;
    onGenerated?: (postId: string) => void;
}

const CONTENT_TYPE_OPTIONS: { value: BlogContentType; label: string; description: string }[] = [
    { value: 'hub', label: 'Hub Pillar Article', description: 'Deep-dive cornerstone content (2000+ words)' },
    { value: 'spoke', label: 'Spoke Article', description: 'Focused sub-topic linking back to hub' },
    { value: 'programmatic', label: 'Market Report', description: 'City/state cannabis market trends' },
    { value: 'comparison', label: 'Competitor Guide', description: '"Best of" or "Alternative to" comparisons' },
    { value: 'report', label: 'Data Report', description: 'State of the Stash quarterly report' },
    { value: 'standard', label: 'Standard Post', description: 'Regular blog post or news article' },
];

const CATEGORY_OPTIONS: { value: BlogCategory; label: string }[] = [
    { value: 'industry_news', label: 'Industry News' },
    { value: 'education', label: 'Education' },
    { value: 'market_report', label: 'Market Report' },
    { value: 'comparison', label: 'Comparison' },
    { value: 'regulatory_alert', label: 'Regulatory Alert' },
    { value: 'product_spotlight', label: 'Product Spotlight' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'cannabis_culture', label: 'Cannabis Culture' },
    { value: 'case_study', label: 'Case Study' },
    { value: 'company_update', label: 'Company Update' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'strain_profile', label: 'Strain Profile' },
];

type Step = 'research' | 'brief' | 'generated';

export function ResearchGeneratorSheet({
    open,
    onOpenChange,
    defaultMode = 'standard',
    seedTopic = '',
    orgId,
    onGenerated,
}: ResearchGeneratorSheetProps) {
    const router = useRouter();
    const [step, setStep] = useState<Step>('research');
    const [topic, setTopic] = useState(seedTopic);
    const [contentType, setContentType] = useState<BlogContentType>(defaultMode);
    const [category, setCategory] = useState<BlogCategory>('industry_news');
    const [isResearching, setIsResearching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [brief, setBrief] = useState<ResearchBrief | null>(null);
    const [generatedPostId, setGeneratedPostId] = useState<string | null>(null);
    const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setTopic(seedTopic);
        setContentType(defaultMode);
        setError(null);
    }, [defaultMode, open, seedTopic]);

    const resetToStep1 = () => {
        setStep('research');
        setBrief(null);
        setGeneratedPostId(null);
        setGeneratedTitle(null);
        setError(null);
    };

    const handleResearch = async () => {
        if (!topic.trim()) return;
        setIsResearching(true);
        setError(null);
        try {
            const result = await generateResearchBrief(topic.trim(), category);
            setBrief(result);
            setStep('brief');
        } catch (e) {
            setError('Research failed. Please try again.');
        } finally {
            setIsResearching(false);
        }
    };

    const handleGenerate = async () => {
        if (!brief) return;
        setIsGenerating(true);
        setError(null);
        try {
            const post = await researchAndGenerateBlog({
                topic: brief.topic,
                category,
                contentType,
                brief,
                orgId,
            });
            setGeneratedPostId(post.id);
            setGeneratedTitle(post.title);
            setStep('generated');
            onGenerated?.(post.id);
        } catch (e) {
            setError('Post generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEditPost = () => {
        if (generatedPostId) {
            router.push(`/dashboard/blog/${generatedPostId}`);
            onOpenChange(false);
        }
    };

    const handleClose = () => {
        resetToStep1();
        onOpenChange(false);
    };

    const stepLabel = step === 'research' ? '1 of 3' : step === 'brief' ? '2 of 3' : '3 of 3';

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
                <SheetHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-xl">Research & Generate</SheetTitle>
                            <SheetDescription>
                                Step {stepLabel} —{' '}
                                {step === 'research' && 'Search cannabis industry sources'}
                                {step === 'brief' && 'Review AI research brief'}
                                {step === 'generated' && 'Post created!'}
                            </SheetDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">{stepLabel}</Badge>
                    </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    {/* ── Step 1: Research ─────────────────────────────── */}
                    {step === 'research' && (
                        <div className="space-y-5">
                            {/* Topic */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Topic</label>
                                <Input
                                    placeholder="e.g. cannabis loyalty programs, NY dispensary regulations..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                                    className="text-base"
                                />
                            </div>

                            {/* Content Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Content Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setContentType(opt.value)}
                                            className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                                                contentType === opt.value
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-border hover:border-primary/50'
                                            }`}
                                        >
                                            <div className="font-medium">{opt.label}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select value={category} onValueChange={(v) => setCategory(v as BlogCategory)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {error && <p className="text-sm text-destructive">{error}</p>}

                            <Button
                                onClick={handleResearch}
                                disabled={!topic.trim() || isResearching}
                                className="w-full"
                                size="lg"
                            >
                                {isResearching ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Searching 5+ cannabis industry sources...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" />
                                        Research Now
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* ── Step 2: Brief Review ─────────────────────────── */}
                    {step === 'brief' && brief && (
                        <div className="space-y-5">
                            {/* Title suggestion */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Suggested Title</label>
                                <p className="text-base font-semibold leading-snug">{brief.suggestedTitle}</p>
                            </div>

                            {/* Key Findings */}
                            <Card>
                                <CardContent className="pt-4 space-y-2">
                                    <p className="text-sm font-medium">Key Research Findings</p>
                                    <ul className="space-y-1.5">
                                        {brief.keyFindings.map((f, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                                                <span className="text-primary mt-0.5">•</span>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            {brief.analyticsSignals && (
                                <Card>
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-medium">BakedBot Growth Signals</p>
                                            <div className="flex items-center gap-1">
                                                <Badge variant={brief.analyticsSignals.gaConnected ? 'secondary' : 'outline'} className="text-[10px]">
                                                    GA {brief.analyticsSignals.gaConnected ? 'Live' : 'Off'}
                                                </Badge>
                                                <Badge variant={brief.analyticsSignals.gscConnected ? 'secondary' : 'outline'} className="text-[10px]">
                                                    GSC {brief.analyticsSignals.gscConnected ? 'Live' : 'Off'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="rounded-md border p-2">
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sessions</p>
                                                <p className="mt-1 text-sm font-semibold">
                                                    {brief.analyticsSignals.kpis.sessions28d?.toLocaleString() ?? 'Not connected'}
                                                </p>
                                            </div>
                                            <div className="rounded-md border p-2">
                                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Impressions</p>
                                                <p className="mt-1 text-sm font-semibold">
                                                    {brief.analyticsSignals.kpis.impressions28d?.toLocaleString() ?? 'Not connected'}
                                                </p>
                                            </div>
                                        </div>
                                        {brief.analyticsSignals.recommendations.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Why This Topic Matters
                                                </p>
                                                {(brief.analyticsSignals.recommendations as { source: string; title: string; supportingMetric: string }[]).slice(0, 2).map((recommendation, index) => (
                                                    <div key={`${recommendation.source}-${index}`} className="rounded-md bg-muted/50 p-2.5 text-sm">
                                                        <p className="font-medium">{recommendation.title}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {recommendation.supportingMetric}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Suggested Angles */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Suggested Content Angles</p>
                                <div className="space-y-2">
                                    {brief.suggestedAngles.map((angle, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 text-sm">
                                            <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                            <span>{angle}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Competitor Gaps */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Underserved Angles (Blue Ocean)</p>
                                <div className="flex flex-wrap gap-2">
                                    {brief.competitorGaps.map((gap, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">{gap}</Badge>
                                    ))}
                                </div>
                            </div>

                            {/* SEO Keywords */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Target SEO Keywords</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {brief.suggestedKeywords.map((kw, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                                    ))}
                                </div>
                            </div>

                            {error && <p className="text-sm text-destructive">{error}</p>}

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" onClick={resetToStep1} className="flex-1">
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Research Again
                                </Button>
                                <Button onClick={handleGenerate} disabled={isGenerating} className="flex-1">
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Writing post...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Generate Post
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Generated ────────────────────────────── */}
                    {step === 'generated' && generatedPostId && (
                        <div className="space-y-6 text-center py-8">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Post Created!</h3>
                                {generatedTitle && (
                                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                        &ldquo;{generatedTitle}&rdquo;
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                    Saved as draft — ready for your review and edits
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                <Button onClick={handleEditPost} size="lg">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Edit Post
                                </Button>
                                <Button variant="outline" onClick={resetToStep1}>
                                    Generate Another
                                </Button>
                                <Button variant="ghost" onClick={handleClose}>
                                    <X className="mr-2 h-4 w-4" />
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
