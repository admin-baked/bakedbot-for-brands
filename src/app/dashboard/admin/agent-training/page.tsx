'use client';

/**
 * Admin — Agent Training Audit
 *
 * Shows the Grok-graded training run history for all 14 agents.
 * Mirrors the #agent-audit Slack Block Kit dashboard in the web UI.
 *
 * Data source: Firestore training_runs/{YYYY-MM-DD}
 * Protected by AdminLayout → requireSuperUser()
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ExternalLink } from 'lucide-react';
import type { TrainingRun, AgentResult } from '@/app/api/admin/training-runs/route';

// ─── Grade helpers ────────────────────────────────────────────────────────────
const GRADE_EMOJI: Record<string, string> = {
  great: '🟢', good: '🟡', ok: '🟠', poor: '🔴', fail: '⛔', error: '❓', ungraded: '⬜',
};

const GRADE_COLOR: Record<string, string> = {
  great: 'bg-green-100 text-green-800 border-green-200',
  good: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ok: 'bg-orange-100 text-orange-800 border-orange-200',
  poor: 'bg-red-100 text-red-800 border-red-200',
  fail: 'bg-purple-100 text-purple-800 border-purple-200',
  error: 'bg-gray-100 text-gray-600 border-gray-200',
  ungraded: 'bg-gray-50 text-gray-400 border-gray-100',
};

function GradeBadge({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${GRADE_COLOR[label] ?? GRADE_COLOR.ungraded}`}>
      {GRADE_EMOJI[label] ?? '⬜'} {label.toUpperCase()}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round((score / 10) * 100);
  const color = score >= 9 ? 'bg-green-500' : score >= 7 ? 'bg-yellow-400' : score >= 5 ? 'bg-orange-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground w-8">{score}/10</span>
    </div>
  );
}

// ─── Question drill-down row ──────────────────────────────────────────────────
function QuestionRow({ result }: { result: AgentResult }) {
  const [open, setOpen] = useState(false);
  const label = result.grade?.label ?? 'ungraded';
  const score = result.grade?.score ?? 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 cursor-pointer">
          <span className="text-sm">{GRADE_EMOJI[label] ?? '⬜'}</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{result.tag}</code>
          <ScoreBar score={score} />
          {result.responseTimeSec != null && (
            <span className="text-xs text-muted-foreground tabular-nums ml-auto shrink-0">{result.responseTimeSec}s</span>
          )}
          <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mx-3 mb-3 p-3 bg-muted/40 rounded-md space-y-2 text-sm">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Question</p>
          <p className="italic">{result.q}</p>
          {result.responseSnippet && (
            <>
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide mt-2">Response preview</p>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{result.responseSnippet}</p>
            </>
          )}
          {result.grade?.issues && result.grade.issues.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {result.grade.issues.map((issue, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded border border-red-100">
                  ⚠️ {issue}
                </span>
              ))}
            </div>
          )}
          {result.grade?.strength && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1">
              ✨ {result.grade.strength}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Per-agent card ───────────────────────────────────────────────────────────
function AgentCard({ name, summary }: { name: string; summary: TrainingRun['agents'][string] }) {
  const [open, setOpen] = useState(false);
  const worstResult = summary.results.reduce((worst, r) => {
    const rank: Record<string, number> = { error: 0, fail: 1, poor: 2, ok: 3, good: 4, great: 5, ungraded: 3 };
    const cur = rank[r.grade?.label ?? 'ungraded'] ?? 3;
    const prevRank = rank[worst.grade?.label ?? 'ungraded'] ?? 3;
    return cur < prevRank ? r : worst;
  }, summary.results[0]);
  const leadLabel = worstResult?.grade?.label ?? 'ungraded';
  const needsReview = summary.results.some(r => ['poor', 'fail'].includes(r.grade?.label ?? ''));

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl">{GRADE_EMOJI[leadLabel]}</span>
                <CardTitle className="text-base font-semibold truncate">{name.replace('_', ' ').toUpperCase()}</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {needsReview && (
                  <Badge variant="destructive" className="text-xs">Needs Review</Badge>
                )}
                <span className="text-sm font-medium tabular-nums">{summary.pct}%</span>
                <span className="text-xs text-muted-foreground">{summary.ok}/{summary.total}</span>
                <span className="text-xs text-muted-foreground">avg {summary.avgScore}/10</span>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {/* Score strip */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {summary.results.map((r, i) => (
                <span key={i} className="flex items-center gap-1 text-xs">
                  {GRADE_EMOJI[r.grade?.label ?? 'ungraded']}
                  <code className="bg-muted px-1 rounded text-muted-foreground">{r.tag}</code>
                </span>
              ))}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-2">
            <div className="divide-y divide-border">
              {summary.results.map((r, i) => (
                <QuestionRow key={i} result={r} />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Run selector + summary header ───────────────────────────────────────────
function RunHeader({ run }: { run: TrainingRun }) {
  const agentNames = Object.keys(run.agents);
  const gradeEmoji = run.overallPct >= 90 ? '🏆' : run.overallPct >= 75 ? '✅' : run.overallPct >= 60 ? '⚠️' : '🚨';
  const slackUrl = run.slackTs
    ? `https://slack.com/app_redirect?channel=C0AT7C378CW&message_ts=${run.slackTs}`
    : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{gradeEmoji}</span>
          <h2 className="text-xl font-bold">{run.overallPct}% passing</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {run.runDate} · {agentNames.length} agents · {run.grokCallCount} Grok calls · {run.grokDailyTokens.toLocaleString()} tokens · ~$0.00
        </p>
      </div>
      {slackUrl && (
        <Button variant="outline" size="sm" asChild>
          <a href={slackUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View in Slack
          </a>
        </Button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AgentTrainingPage() {
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TrainingRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/training-runs')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setRuns(data.runs ?? []);
        setSelectedRun(data.runs?.[0] ?? null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-3 mt-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-destructive text-sm">Failed to load training runs: {error}</p>
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="p-8 space-y-2">
        <h1 className="text-2xl font-bold">Agent Training</h1>
        <p className="text-muted-foreground text-sm">
          No training runs yet. Run the Grok training loop to generate your first audit:
        </p>
        <code className="block mt-3 text-xs bg-muted rounded p-3 whitespace-pre">
          {`CRON_SECRET='...' GROQ_API_KEY='...' node tmp/grok-training-loop.mjs`}
        </code>
      </div>
    );
  }

  const agentEntries = selectedRun ? Object.entries(selectedRun.agents) : [];
  const needsReview = agentEntries.filter(([, s]) =>
    s.results.some(r => ['poor', 'fail'].includes(r.grade?.label ?? ''))
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Training</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Grok-graded Q&amp;A audit — {runs.length} run{runs.length !== 1 ? 's' : ''} on record
          </p>
        </div>
        {/* Run selector */}
        {runs.length > 1 && (
          <select
            className="text-sm border rounded-md px-3 py-1.5 bg-background"
            value={selectedRun?.id ?? ''}
            onChange={e => setSelectedRun(runs.find(r => r.id === e.target.value) ?? null)}
          >
            {runs.map(r => (
              <option key={r.id} value={r.id}>{r.runDate} — {r.overallPct}%</option>
            ))}
          </select>
        )}
      </div>

      {/* Grade legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(['great', 'good', 'ok', 'poor', 'fail'] as const).map(l => (
          <GradeBadge key={l} label={l} />
        ))}
      </div>

      {selectedRun && (
        <>
          <RunHeader run={selectedRun} />

          {/* Needs review banner */}
          {needsReview.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xl">🔴</span>
              <div>
                <p className="text-sm font-semibold text-red-900">
                  {needsReview.length} agent{needsReview.length !== 1 ? 's' : ''} flagged for manual review
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  {needsReview.map(([name]) => name).join(', ')} — expand to see which questions failed
                </p>
              </div>
            </div>
          )}

          {/* Agent cards */}
          <div className="space-y-3">
            {agentEntries
              .sort(([, a], [, b]) => a.pct - b.pct) // worst first
              .map(([name, summary]) => (
                <AgentCard key={name} name={name} summary={summary} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
