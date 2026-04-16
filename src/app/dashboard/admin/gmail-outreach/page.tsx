'use client';

/**
 * Admin — Gmail Outreach Monitor
 *
 * Audit outreach emails sent by the NY automation pipeline.
 * Grade each message (subject, personalization, CTA) to feed Marty's learning loop.
 * Human feedback is the primary training signal for improving outreach quality.
 *
 * Data: ny_outreach_drafts (status=sent) + Gmail API replies
 * Protected by AdminLayout → requireSuperUser()
 */

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { ChevronRight, Mail, MessageSquare, Star, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { OutreachThread } from '@/app/api/admin/gmail-outreach/route';

// ─── Grade config ─────────────────────────────────────────────────────────────

const GRADES = ['great', 'good', 'ok', 'poor', 'fail'] as const;
type Grade = typeof GRADES[number];

const GRADE_EMOJI: Record<Grade, string> = {
    great: '🟢', good: '🟡', ok: '🟠', poor: '🔴', fail: '⛔',
};

const GRADE_COLOR: Record<Grade, string> = {
    great: 'bg-green-100 text-green-800 border-green-200',
    good: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    ok: 'bg-orange-100 text-orange-800 border-orange-200',
    poor: 'bg-red-100 text-red-800 border-red-200',
    fail: 'bg-purple-100 text-purple-800 border-purple-200',
};

function GradeBadge({ label }: { label: string }) {
    const color = GRADE_COLOR[label as Grade] ?? 'bg-gray-100 text-gray-500 border-gray-200';
    const emoji = GRADE_EMOJI[label as Grade] ?? '⬜';
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
            {emoji} {label.toUpperCase()}
        </span>
    );
}

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                    <button
                        key={n}
                        onClick={() => onChange(n)}
                        className={`text-lg transition-opacity ${n <= value ? 'opacity-100' : 'opacity-25 hover:opacity-60'}`}
                    >
                        ⭐
                    </button>
                ))}
            </div>
            <span className="text-xs text-muted-foreground">{value}/5</span>
        </div>
    );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: { total: number; replied: number; graded: number; replyRate: number } }) {
    return (
        <div className="grid grid-cols-4 gap-4">
            {[
                { label: 'Sent', value: stats.total, icon: <Mail className="h-4 w-4 text-blue-500" /> },
                { label: 'Replied', value: stats.replied, icon: <MessageSquare className="h-4 w-4 text-green-500" /> },
                { label: 'Reply Rate', value: `${stats.replyRate}%`, icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
                { label: 'Graded', value: stats.graded, icon: <Star className="h-4 w-4 text-yellow-500" /> },
            ].map(s => (
                <Card key={s.label} className="py-3">
                    <CardContent className="px-4 py-0 flex items-center gap-3">
                        {s.icon}
                        <div>
                            <p className="text-xl font-bold tabular-nums">{s.value}</p>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ─── Grade panel (inline per thread) ─────────────────────────────────────────

function GradePanel({ thread, onGraded }: { thread: OutreachThread; onGraded: () => void }) {
    const [grade, setGrade] = useState<Grade | null>((thread.humanGrade as Grade) ?? null);
    const [subjectScore, setSubjectScore] = useState(thread.subjectScore ?? 3);
    const [personalizationScore, setPersonalizationScore] = useState(thread.personalizationScore ?? 3);
    const [ctaScore, setCtaScore] = useState(thread.ctaScore ?? 3);
    const [feedback, setFeedback] = useState(thread.humanFeedback ?? '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(!!thread.humanGrade);

    const submit = useCallback(async () => {
        if (!grade) return;
        setSaving(true);
        try {
            await fetch('/api/admin/gmail-outreach/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    draftId: thread.draftId,
                    leadId: thread.leadId,
                    dispensaryName: thread.dispensaryName,
                    templateId: thread.templateId,
                    subject: thread.subject,
                    grade,
                    subjectScore,
                    personalizationScore,
                    ctaScore,
                    feedback,
                }),
            });
            setSaved(true);
            onGraded();
        } finally {
            setSaving(false);
        }
    }, [grade, subjectScore, personalizationScore, ctaScore, feedback, thread, onGraded]);

    return (
        <div className="border-t pt-4 mt-2 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {saved ? '✅ Grade Saved — Marty is learning' : 'Grade this outreach'}
            </p>

            {/* Dimension scores */}
            <div className="space-y-2">
                <StarRating label="Subject line" value={subjectScore} onChange={setSubjectScore} />
                <StarRating label="Personalization" value={personalizationScore} onChange={setPersonalizationScore} />
                <StarRating label="Call to action" value={ctaScore} onChange={setCtaScore} />
            </div>

            {/* Overall grade */}
            <div className="flex gap-2 flex-wrap">
                {GRADES.map(g => (
                    <button
                        key={g}
                        onClick={() => setGrade(g)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                            grade === g
                                ? GRADE_COLOR[g] + ' ring-2 ring-offset-1 ring-current'
                                : 'border-border text-muted-foreground hover:border-foreground/40'
                        }`}
                    >
                        {GRADE_EMOJI[g]} {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                ))}
            </div>

            {/* Feedback */}
            <Textarea
                placeholder="Optional: what would make this message better? What angle landed? What felt off?"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                rows={3}
                className="text-sm"
            />

            <Button
                onClick={submit}
                disabled={!grade || saving}
                size="sm"
                className="w-full"
            >
                {saving ? 'Saving…' : saved ? 'Update Grade' : 'Save Grade → Learning Loop'}
            </Button>
        </div>
    );
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({ thread, onGraded }: { thread: OutreachThread; onGraded: () => void }) {
    const [open, setOpen] = useState(thread.replied && !thread.humanGrade);

    const sentDate = thread.sentAt
        ? new Date(thread.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Unknown date';

    return (
        <Card className={`transition-all ${thread.replied ? 'border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/10' : ''}`}>
            <Collapsible open={open} onOpenChange={setOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 rounded-t-lg transition-colors py-4">
                        <div className="flex items-start gap-3">
                            <ChevronRight className={`h-4 w-4 mt-0.5 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                            <div className="flex-1 min-w-0">
                                {/* Top row */}
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <CardTitle className="text-sm font-semibold">{thread.dispensaryName}</CardTitle>
                                    <span className="text-xs text-muted-foreground">{thread.city}, {thread.state}</span>
                                    {thread.replied && (
                                        <Badge className="bg-green-500/10 text-green-700 border-green-300 text-xs">
                                            💬 Replied
                                        </Badge>
                                    )}
                                    {thread.humanGrade && <GradeBadge label={thread.humanGrade} />}
                                    {!thread.humanGrade && (
                                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                            Needs Grade
                                        </Badge>
                                    )}
                                </div>
                                {/* Subject */}
                                <p className="text-sm text-foreground font-medium truncate">{thread.subject}</p>
                                {/* Meta row */}
                                <div className="flex items-center gap-3 mt-1">
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{thread.templateId}</code>
                                    <span className="text-xs text-muted-foreground">Confidence: {thread.confidence}</span>
                                    <span className="text-xs text-muted-foreground">T{thread.touchNumber}</span>
                                    <span className="text-xs text-muted-foreground">{sentDate}</span>
                                    {thread.flags.length > 0 && (
                                        <span className="text-xs text-amber-600">⚠ {thread.flags.join(', ')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-4">
                        {/* Email body */}
                        {thread.textBody && (
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sent Email</p>
                                <div className="bg-muted/40 rounded-md p-3 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                                    {thread.textBody}
                                </div>
                            </div>
                        )}

                        {/* Reply */}
                        {thread.replied && (
                            <div>
                                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
                                    💬 Reply from {thread.replyEmail}
                                </p>
                                {thread.replyBody ? (
                                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md p-3 text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                        {thread.replyBody}
                                    </div>
                                ) : (
                                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-md p-3 text-sm text-muted-foreground italic">
                                        Reply detected — subject: &quot;{thread.replySubject}&quot;. Body not loaded (check Gmail inbox).
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Grade panel */}
                        <GradePanel thread={thread} onGraded={onGraded} />
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Filter = 'all' | 'replied' | 'ungraded' | 'graded';

export default function GmailOutreachPage() {
    const [threads, setThreads] = useState<OutreachThread[]>([]);
    const [stats, setStats] = useState({ total: 0, replied: 0, graded: 0, replyRate: 0 });
    const [filter, setFilter] = useState<Filter>('all');
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/gmail-outreach?filter=${filter}&limit=50`);
            const data = await res.json();
            setThreads(data.threads || []);
            setStats(data.stats || { total: 0, replied: 0, graded: 0, replyRate: 0 });
        } finally {
            setLoading(false);
        }
    }, [filter, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load(); }, [load]);

    const FILTERS: { key: Filter; label: string }[] = [
        { key: 'all', label: `All (${stats.total})` },
        { key: 'replied', label: `Replied (${stats.replied})` },
        { key: 'ungraded', label: `Needs Grade` },
        { key: 'graded', label: `Graded (${stats.graded})` },
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gmail Outreach Monitor</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Grade outreach emails to train Marty&apos;s learning loop. Replies auto-detected.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRefreshKey(k => k + 1)}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <StatsBar stats={stats} />

            {/* Needs-grade alert */}
            {stats.total - stats.graded > 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-amber-800 dark:text-amber-200">
                        <strong>{stats.total - stats.graded}</strong> emails need grading — your feedback directly trains Marty&apos;s outreach strategy.
                    </span>
                    <Button variant="outline" size="sm" className="ml-auto text-xs" onClick={() => setFilter('ungraded')}>
                        Grade Now
                    </Button>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                            filter === f.key
                                ? 'bg-foreground text-background border-foreground'
                                : 'border-border text-muted-foreground hover:border-foreground/40'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Thread list */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="py-4">
                                <div className="h-4 bg-muted rounded w-1/3" />
                                <div className="h-3 bg-muted rounded w-2/3 mt-2" />
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            ) : threads.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />
                        <p>No outreach emails found for this filter.</p>
                        <p className="text-sm mt-1">The NY outreach runner fires daily at 9AM EST.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {/* Sort: replied+ungraded first, then ungraded, then graded */}
                    {[...threads]
                        .sort((a, b) => {
                            const aScore = (a.replied ? 2 : 0) + (!a.humanGrade ? 1 : 0);
                            const bScore = (b.replied ? 2 : 0) + (!b.humanGrade ? 1 : 0);
                            if (bScore !== aScore) return bScore - aScore;
                            return (b.sentAt ?? 0) - (a.sentAt ?? 0);
                        })
                        .map(thread => (
                            <ThreadCard
                                key={thread.draftId}
                                thread={thread}
                                onGraded={() => setRefreshKey(k => k + 1)}
                            />
                        ))
                    }
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-3 flex-wrap text-xs text-muted-foreground pt-2 border-t">
                <span className="font-medium">Grade legend:</span>
                {GRADES.map(g => (
                    <span key={g}>{GRADE_EMOJI[g]} {g.charAt(0).toUpperCase() + g.slice(1)}</span>
                ))}
                <span className="ml-auto">Grades feed directly into Marty&apos;s dream loop + agent_learning_log</span>
            </div>
        </div>
    );
}
