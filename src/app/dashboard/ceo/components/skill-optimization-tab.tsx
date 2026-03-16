'use client';
/**
 * Skills Lab — CEO Dashboard Tab
 *
 * Super User interface for the champion/challenger skill optimization platform.
 *
 * Sections:
 *   1. Skill Registry       — all optimizable skills with status cards
 *   2. Skill Detail         — instructions viewer/editor, eval spec, hard rules
 *   3. Eval Runner          — run fast (regex/rule) eval and see per-criterion results
 *   4. Experiment Ledger    — past champion/challenger runs from Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    FlaskConical,
    Shield,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronRight,
    ArrowLeft,
    Play,
    Save,
    Trash2,
    TrendingUp,
    Lock,
    FileText,
    ListChecks,
    History,
    Loader2,
    SkipForward,
    BookOpen,
    Beaker,
} from 'lucide-react';

import {
    getSkillRegistry,
    getSkillDetail,
    saveChallenger,
    runFastEval,
    getExperiments,
    promoteChallenger,
    deleteChallenger,
    type SkillRegistryEntry,
    type SkillDetail,
    type FastEvalResult,
} from '@/server/actions/skill-optimization';
import type { SkillExperiment } from '@/types/skill-experiment';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number) {
    return `${(n * 100).toFixed(1)}%`;
}

function promotionStatusColor(status: string) {
    switch (status) {
        case 'champion': return 'bg-green-100 text-green-800 border-green-200';
        case 'limited': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'shadow': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'dev': return 'bg-amber-100 text-amber-800 border-amber-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
}

function criterionTypeIcon(type: string) {
    switch (type) {
        case 'regex': return '⚡';
        case 'rule': return '📐';
        case 'judge': return '🧠';
        default: return '?';
    }
}

function criterionCategoryColor(category: string) {
    switch (category) {
        case 'compliance': return 'text-red-600';
        case 'quality': return 'text-green-600';
        case 'format': return 'text-blue-600';
        case 'accuracy': return 'text-purple-600';
        default: return 'text-gray-600';
    }
}

// ─── Skill Registry Card ──────────────────────────────────────────────────────

function SkillCard({
    entry,
    onSelect,
}: {
    entry: SkillRegistryEntry;
    onSelect: () => void;
}) {
    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
            onClick={onSelect}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <CardTitle className="text-base">{entry.metadata.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{entry.skillPath}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {entry.hasChallengerCandidate && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                Challenger ready
                            </Badge>
                        )}
                        <Badge
                            variant="outline"
                            className={cn('text-xs capitalize', promotionStatusColor(entry.metadata.promotionStatus))}
                        >
                            {entry.metadata.promotionStatus}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-red-500" />
                        {entry.gateCount} gates
                    </span>
                    <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {entry.criteriaCount} quality checks
                    </span>
                    <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {entry.devCaseCount} dev / {entry.holdoutCaseCount} holdout
                    </span>
                    <span className="ml-auto font-mono text-primary">
                        v{entry.metadata.championVersion}
                    </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                    {entry.metadata.description}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Criterion Row ────────────────────────────────────────────────────────────

function CriterionRow({
    criterion,
    passRate,
}: {
    criterion: { id: string; name: string; type: string; isGate: boolean; category: string; weight?: number };
    passRate?: number;
}) {
    return (
        <div className="flex items-center gap-3 py-2 border-b last:border-0">
            <span className="text-base w-5">{criterionTypeIcon(criterion.type)}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{criterion.name}</span>
                    {criterion.isGate && (
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 shrink-0">
                            GATE
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-xs font-mono uppercase', criterionCategoryColor(criterion.category))}>
                        {criterion.category}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{criterion.type}</span>
                    {!criterion.isGate && (
                        <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">weight {criterion.weight ?? 1}</span>
                        </>
                    )}
                </div>
            </div>
            {passRate !== undefined && passRate >= 0 && (
                <div className={cn(
                    'text-sm font-mono font-bold shrink-0',
                    passRate === 1 ? 'text-green-600' : passRate >= 0.75 ? 'text-amber-600' : 'text-red-600'
                )}>
                    {pct(passRate)}
                </div>
            )}
            <span className="text-xs text-muted-foreground font-mono shrink-0">{criterion.id}</span>
        </div>
    );
}

// ─── Eval Results Panel ───────────────────────────────────────────────────────

function EvalResultsPanel({ result, evalSpec }: { result: FastEvalResult; evalSpec: { criteria: Array<{ id: string; name: string; type: string; isGate: boolean; category: string; weight?: number }> } }) {
    const scorePct = result.compositeScore;

    return (
        <div className="space-y-4">
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Dataset</div>
                    <div className="font-mono text-sm font-bold capitalize">{result.dataset}</div>
                </Card>
                <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Gates</div>
                    <div className={cn('font-bold text-sm', result.anyGateFailure ? 'text-red-600' : 'text-green-600')}>
                        {result.anyGateFailure ? '⛔ FAILED' : '✅ PASSED'}
                    </div>
                </Card>
                <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Composite Score</div>
                    <div className={cn(
                        'font-bold text-lg font-mono',
                        scorePct >= 0.8 ? 'text-green-600' : scorePct >= 0.6 ? 'text-amber-600' : 'text-red-600'
                    )}>
                        {pct(scorePct)}
                    </div>
                </Card>
                <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Cases</div>
                    <div className="font-bold text-sm">{result.gatesPassedCount}/{result.totalCases} gates pass</div>
                </Card>
            </div>

            {/* Per-criterion breakdown */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Criterion Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="divide-y">
                        {evalSpec.criteria.map(criterion => {
                            const rate = result.criteriaPassRates[criterion.id];
                            return (
                                <CriterionRow
                                    key={criterion.id}
                                    criterion={criterion}
                                    passRate={rate}
                                />
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Per-case results */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Case Results</CardTitle>
                    <CardDescription className="text-xs">
                        Note: Dev/holdout cases show gate checks only in fast mode (no LLM generation). Regression cases use injected outputs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {result.caseResults.map(c => (
                            <div key={c.caseId} className="flex items-center gap-2 text-xs">
                                {c.gatesPassed
                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                    : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                }
                                <span className="font-mono text-muted-foreground w-24 shrink-0">{c.caseId}</span>
                                <span className="flex gap-1 flex-wrap">
                                    {c.criteriaResults.map(cr => (
                                        <span
                                            key={cr.criterionId}
                                            title={`${cr.criterionId}: ${cr.criterionName}`}
                                            className={cn(
                                                'inline-block w-2 h-2 rounded-full',
                                                cr.skipped ? 'bg-gray-300' : cr.passed ? 'bg-green-500' : 'bg-red-500'
                                            )}
                                        />
                                    ))}
                                </span>
                                <span className="ml-auto font-mono">
                                    {c.maxScore > 0 ? pct(c.passRate) : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                        Dots: 🟢 pass · 🔴 fail · ⚫ skipped (judge check — run with CLI --full for LLM scoring)
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Experiment Ledger Table ──────────────────────────────────────────────────

function ExperimentLedger({ experiments }: { experiments: SkillExperiment[] }) {
    if (experiments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                No experiments recorded yet. Run an eval with <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">--record</code> flag from CLI to populate this ledger.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Date</th>
                        <th className="text-left py-2 pr-3 font-medium">Challenger</th>
                        <th className="text-left py-2 pr-3 font-medium">Dataset</th>
                        <th className="text-right py-2 pr-3 font-medium">Champion</th>
                        <th className="text-right py-2 pr-3 font-medium">Challenger</th>
                        <th className="text-right py-2 pr-3 font-medium">Delta</th>
                        <th className="text-left py-2 pr-3 font-medium">Decision</th>
                        <th className="text-left py-2 font-medium">Stage</th>
                    </tr>
                </thead>
                <tbody>
                    {experiments.map(exp => {
                        const delta = exp.score_delta;
                        return (
                            <tr key={exp.experiment_id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2 pr-3 font-mono text-muted-foreground">
                                    {new Date(exp.timestamp).toLocaleDateString()}
                                </td>
                                <td className="py-2 pr-3 font-mono">{exp.candidate_version}</td>
                                <td className="py-2 pr-3 capitalize">{exp.dataset_type}</td>
                                <td className="py-2 pr-3 text-right font-mono">
                                    {pct(exp.champion_metrics.compositeScore)}
                                </td>
                                <td className="py-2 pr-3 text-right font-mono">
                                    {pct(exp.challenger_metrics.compositeScore)}
                                </td>
                                <td className={cn(
                                    'py-2 pr-3 text-right font-mono font-bold',
                                    delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-muted-foreground'
                                )}>
                                    {delta > 0 ? '+' : ''}{pct(delta)}
                                </td>
                                <td className="py-2 pr-3">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-xs',
                                            exp.keep_or_discard === 'keep' ? 'bg-green-50 text-green-700 border-green-200' :
                                                exp.keep_or_discard === 'discard' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-amber-50 text-amber-700 border-amber-200'
                                        )}
                                    >
                                        {exp.keep_or_discard}
                                    </Badge>
                                </td>
                                <td className="py-2 capitalize text-muted-foreground">{exp.promotion_stage}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Skill Detail View ───────────────────────────────────────────────────

function SkillDetailView({
    detail,
    onBack,
}: {
    detail: SkillDetail;
    onBack: () => void;
}) {
    const [challengerText, setChallengerText] = useState(
        detail.challengerInstructions ?? detail.instructions
    );
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const [isRunning, setRunning] = useState(false);
    const [saveMsg, setSaveMsg] = useState<string | null>(null);
    const [evalResult, setEvalResult] = useState<FastEvalResult | null>(null);
    const [evalDataset, setEvalDataset] = useState<'dev' | 'regression'>('dev');
    const [evalTarget, setEvalTarget] = useState<'champion' | 'challenger'>('champion');
    const [experiments, setExperiments] = useState<SkillExperiment[]>([]);
    const [loadingExperiments, setLoadingExperiments] = useState(false);
    const [isPromoting, setIsPromoting] = useState(false);
    const [activeTab, setActiveTab] = useState('instructions');

    const skillId = detail.metadata.skillId;

    const handleSaveChallenger = async () => {
        setSaving(true);
        setSaveMsg(null);
        const res = await saveChallenger(detail.skillPath, challengerText);
        setSaveMsg(res.success ? '✅ Challenger saved as SKILL.candidate.md' : `❌ ${res.error}`);
        setSaving(false);
        setIsEditing(false);
    };

    const handleDeleteChallenger = async () => {
        if (!confirm('Discard the current challenger candidate?')) return;
        const res = await deleteChallenger(detail.skillPath);
        if (res.success) {
            setSaveMsg('Challenger discarded.');
            setChallengerText(detail.instructions);
        } else {
            setSaveMsg(`❌ ${res.error}`);
        }
    };

    const handleRunEval = async () => {
        setRunning(true);
        setEvalResult(null);
        const res = await runFastEval(detail.skillPath, evalDataset, evalTarget);
        if (res.success && res.result) {
            setEvalResult(res.result);
        } else {
            setSaveMsg(`❌ Eval error: ${res.error}`);
        }
        setRunning(false);
    };

    const handleLoadExperiments = useCallback(async () => {
        setLoadingExperiments(true);
        const res = await getExperiments(skillId);
        setExperiments(res.experiments);
        setLoadingExperiments(false);
    }, [skillId]);

    const handlePromote = async () => {
        if (!confirm(`Promote the current challenger to champion v${detail.metadata.championVersion} → next patch?\n\nThis will:\n• Copy SKILL.candidate.md → SKILL.md\n• Bump champion version\n• Back up current champion\n\nType PROMOTE in the next prompt to confirm.`)) return;
        const confirmation = prompt('Type PROMOTE to confirm:');
        if (confirmation !== 'PROMOTE') return;
        setIsPromoting(true);
        const res = await promoteChallenger(detail.skillPath, 'PROMOTE');
        if (res.success) {
            setSaveMsg(`✅ Promoted to champion v${res.newVersion}`);
        } else {
            setSaveMsg(`❌ ${res.error}`);
        }
        setIsPromoting(false);
    };

    useEffect(() => {
        if (activeTab === 'experiments') {
            handleLoadExperiments();
        }
    }, [activeTab, handleLoadExperiments]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
                    <ArrowLeft className="h-4 w-4" />
                    Registry
                </Button>
                <div className="h-4 w-px bg-border" />
                <div>
                    <h2 className="font-semibold text-base">{detail.metadata.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={cn('text-xs capitalize', promotionStatusColor(detail.metadata.promotionStatus))}>
                            {detail.metadata.promotionStatus}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">v{detail.metadata.championVersion}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{detail.skillPath}</span>
                    </div>
                </div>
                {detail.challengerInstructions && (
                    <Badge variant="outline" className="ml-auto bg-purple-50 text-purple-700 border-purple-200 text-xs">
                        Challenger ready
                    </Badge>
                )}
            </div>

            {saveMsg && (
                <div className={cn(
                    'text-sm px-3 py-2 rounded-md border',
                    saveMsg.startsWith('✅') ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
                )}>
                    {saveMsg}
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="instructions" className="gap-1.5 text-xs">
                        <BookOpen className="h-3.5 w-3.5" />
                        Instructions
                    </TabsTrigger>
                    <TabsTrigger value="evalspec" className="gap-1.5 text-xs">
                        <ListChecks className="h-3.5 w-3.5" />
                        Eval Spec
                    </TabsTrigger>
                    <TabsTrigger value="hardrules" className="gap-1.5 text-xs">
                        <Lock className="h-3.5 w-3.5" />
                        Hard Rules
                    </TabsTrigger>
                    <TabsTrigger value="experiments" className="gap-1.5 text-xs">
                        <History className="h-3.5 w-3.5" />
                        Experiments
                    </TabsTrigger>
                </TabsList>

                {/* ── Instructions ── */}
                <TabsContent value="instructions" className="space-y-4 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="flex-1 text-sm text-muted-foreground">
                            {isEditing
                                ? 'Editing challenger instructions. Save to create SKILL.candidate.md — this does not touch the champion.'
                                : detail.challengerInstructions
                                    ? 'Showing challenger instructions (SKILL.candidate.md). Champion is preserved.'
                                    : 'Showing current champion instructions (SKILL.md).'}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {!isEditing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setChallengerText(detail.instructions); setIsEditing(true); }}
                                    className="gap-1.5"
                                >
                                    <Beaker className="h-3.5 w-3.5" />
                                    Create Challenger
                                </Button>
                            )}
                            {isEditing && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleSaveChallenger}
                                        disabled={isSaving}
                                        className="gap-1.5"
                                    >
                                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                        Save Challenger
                                    </Button>
                                </>
                            )}
                            {!isEditing && detail.challengerInstructions && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        Edit Challenger
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDeleteChallenger}
                                        className="gap-1.5 text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Discard
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handlePromote}
                                        disabled={isPromoting}
                                        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isPromoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                                        Promote
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <Textarea
                            value={challengerText}
                            onChange={e => setChallengerText(e.target.value)}
                            className="font-mono text-xs min-h-[500px] resize-y"
                            spellCheck={false}
                        />
                    ) : (
                        <ScrollArea className="h-[500px] rounded-md border">
                            <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                                {detail.challengerInstructions ?? detail.instructions}
                            </pre>
                        </ScrollArea>
                    )}
                </TabsContent>

                {/* ── Eval Spec ── */}
                <TabsContent value="evalspec" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Hard Gates</div>
                            <div className="font-bold text-2xl text-red-600">
                                {detail.evalSpec.criteria.filter(c => c.isGate).length}
                            </div>
                        </Card>
                        <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Quality Checks</div>
                            <div className="font-bold text-2xl text-green-600">
                                {detail.evalSpec.criteria.filter(c => !c.isGate).length}
                            </div>
                        </Card>
                        <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Min Pass Rate</div>
                            <div className="font-bold text-2xl">{pct(detail.evalSpec.minCriteriaPassRate)}</div>
                        </Card>
                        <Card className="p-3">
                            <div className="text-xs text-muted-foreground">Promotion Δ</div>
                            <div className="font-bold text-2xl text-primary">+{pct(detail.evalSpec.promotionDelta)}</div>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">All Criteria</CardTitle>
                            <CardDescription className="text-xs">
                                Gates block promotion regardless of quality score. Quality checks contribute to composite score.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="mb-2 text-xs text-muted-foreground">
                                ⚡ regex &nbsp;·&nbsp; 📐 rule &nbsp;·&nbsp; 🧠 judge (LLM, requires --full flag in CLI)
                            </div>
                            {detail.evalSpec.criteria.map(c => (
                                <CriterionRow key={c.id} criterion={c} />
                            ))}
                        </CardContent>
                    </Card>

                    {/* Eval Runner */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <FlaskConical className="h-4 w-4" />
                                Run Fast Eval
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Runs regex + rule criteria only. Zero LLM cost. Judge checks are skipped (shown as grey dots).
                                For full eval with judge checks, run from CLI with <code className="font-mono bg-muted px-1 rounded">--full</code>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Dataset:</span>
                                    <div className="flex gap-1">
                                        {(['dev', 'regression'] as const).map(d => (
                                            <Button
                                                key={d}
                                                variant={evalDataset === d ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setEvalDataset(d)}
                                                className="h-7 text-xs capitalize"
                                            >
                                                {d}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                {evalDataset === 'dev' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Instructions:</span>
                                        <div className="flex gap-1">
                                            {(['champion', 'challenger'] as const).map(t => (
                                                <Button
                                                    key={t}
                                                    variant={evalTarget === t ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setEvalTarget(t)}
                                                    disabled={t === 'challenger' && !detail.challengerInstructions}
                                                    className="h-7 text-xs capitalize"
                                                >
                                                    {t}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleRunEval}
                                    disabled={isRunning}
                                    className="gap-1.5 ml-auto"
                                >
                                    {isRunning
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Play className="h-3.5 w-3.5" />
                                    }
                                    {isRunning ? 'Running…' : 'Run Eval'}
                                </Button>
                            </div>

                            {evalResult && (
                                <EvalResultsPanel result={evalResult} evalSpec={detail.evalSpec} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Hard Rules ── */}
                <TabsContent value="hardrules" className="space-y-4 mt-4">
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                        <Lock className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-red-800">
                            <strong>OPTIMIZER CANNOT MODIFY THESE RULES.</strong> Hard rules are separately owned and require a code review PR. The mutation engine is architecturally blocked from touching this file.
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <Card className="p-3">
                            <div className="text-muted-foreground mb-1">Owner</div>
                            <div className="font-medium">{detail.hardRules.owner}</div>
                        </Card>
                        <Card className="p-3">
                            <div className="text-muted-foreground mb-1">Last Reviewed</div>
                            <div className="font-medium">{detail.hardRules.lastReviewed}</div>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                Banned Phrase Patterns
                                <Badge variant="outline" className="ml-auto text-xs">{detail.hardRules.bannedPhrases.length} patterns</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-1.5">
                                {detail.hardRules.bannedPhrases.map(p => (
                                    <code key={p} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded font-mono">
                                        {p}
                                    </code>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Prohibitions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-1.5">
                                {detail.hardRules.prohibitions.map((p, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="text-red-500 mt-0.5 shrink-0">✕</span>
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {detail.hardRules.requiredPhrases.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Required Phrases
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {detail.hardRules.requiredPhrases.map((rp, i) => (
                                        <li key={i} className="text-sm">
                                            <code className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-mono">
                                                {rp.phrase}
                                            </code>
                                            <span className="text-muted-foreground ml-2 text-xs">{rp.condition}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ── Experiments ── */}
                <TabsContent value="experiments" className="mt-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">Experiment Ledger</CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLoadExperiments}
                                    disabled={loadingExperiments}
                                    className="gap-1.5 text-xs"
                                >
                                    {loadingExperiments ? <Loader2 className="h-3 w-3 animate-spin" /> : <History className="h-3 w-3" />}
                                    Refresh
                                </Button>
                            </div>
                            <CardDescription className="text-xs">
                                All champion/challenger runs for this skill. Populated when running CLI eval with <code className="font-mono bg-muted px-1 rounded">--record</code>.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingExperiments ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <ExperimentLedger experiments={experiments} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Root Tab Component ───────────────────────────────────────────────────────

export default function SkillOptimizationTab() {
    const [skills, setSkills] = useState<SkillRegistryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        getSkillRegistry()
            .then(res => {
                if (res.success) {
                    setSkills(res.skills);
                } else {
                    setError(res.error ?? 'Failed to load registry');
                }
            })
            .catch(err => {
                setError(err instanceof Error ? err.message : String(err));
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleSelectSkill = async (skillPath: string) => {
        setLoadingDetail(true);
        const res = await getSkillDetail(skillPath);
        if (res.success && res.detail) {
            setSelectedSkill(res.detail);
        } else {
            setError(res.error ?? 'Failed to load skill');
        }
        setLoadingDetail(false);
    };

    if (loadingDetail) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (selectedSkill) {
        return (
            <SkillDetailView
                detail={selectedSkill}
                onBack={() => setSelectedSkill(null)}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <FlaskConical className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="font-display font-bold text-xl">Skills Lab</h1>
                    <p className="text-sm text-muted-foreground">
                        Champion / challenger skill optimization — view, test, and evolve skill packages
                    </p>
                </div>
            </div>

            {/* How it works */}
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
                <div className="font-medium text-foreground mb-2">How the loop works</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    {[
                        { icon: '1️⃣', label: 'View champion SKILL.md — the current mutable instructions' },
                        { icon: '2️⃣', label: 'Edit or paste a challenger variant — saved as SKILL.candidate.md' },
                        { icon: '3️⃣', label: 'Run eval — binary criteria score both versions' },
                        { icon: '4️⃣', label: 'Promote if challenger beats champion by ≥5% on holdout' },
                    ].map(step => (
                        <div key={step.icon} className="flex items-start gap-2 bg-background rounded p-2 border">
                            <span>{step.icon}</span>
                            <span>{step.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Registry */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            ) : skills.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                    No optimizable skills found. Add a <code className="font-mono text-xs bg-muted px-1 rounded">metadata.json</code> to a skill directory to register it.
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                        {skills.length} skill{skills.length !== 1 ? 's' : ''} registered
                    </div>
                    {skills.map(entry => (
                        <SkillCard
                            key={entry.skillPath}
                            entry={entry}
                            onSelect={() => handleSelectSkill(entry.skillPath)}
                        />
                    ))}
                </div>
            )}

            {/* CLI Reference */}
            <Card className="border-dashed">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">CLI Eval Runner</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-xs font-mono">
                        <div className="bg-muted rounded p-2 overflow-x-auto">
                            <span className="text-muted-foreground"># Validate champion (fast, free)</span>{'\n'}
                            node --env-file=.env.local scripts/run-skill-eval.mjs --skill domain/product-description --mode dev
                        </div>
                        <div className="bg-muted rounded p-2 overflow-x-auto">
                            <span className="text-muted-foreground"># Full eval with judge checks (~$0.05–0.15)</span>{'\n'}
                            node --env-file=.env.local scripts/run-skill-eval.mjs --skill domain/product-description --mode dev --full
                        </div>
                        <div className="bg-muted rounded p-2 overflow-x-auto">
                            <span className="text-muted-foreground"># Champion vs challenger comparison</span>{'\n'}
                            node --env-file=.env.local scripts/run-skill-eval.mjs --skill domain/product-description --mode dev --challenger SKILL.candidate.md --full
                        </div>
                        <div className="bg-muted rounded p-2 overflow-x-auto">
                            <span className="text-muted-foreground"># Regression gate integrity check</span>{'\n'}
                            node --env-file=.env.local scripts/run-skill-eval.mjs --skill domain/product-description --mode regression
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
