'use client';
/**
 * AI Economics Tab — CEO Dashboard
 *
 * Three sections:
 * A. Platform AI Spend (agent_telemetry — real Firestore costs)
 * B. Dev Tools Savings (GLM cycle + jcodemunch)
 * C. Quick Links
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
    DollarSign,
    Bot,
    Zap,
    TrendingUp,
    AlertTriangle,
    ExternalLink,
    Cpu,
    Code2,
} from 'lucide-react';
import {
    getAgentTelemetrySummary,
    getDevToolsSavings,
    getPlatformAIBudgetStatus,
    type AgentTelemetrySummary,
    type DevToolsSavings,
    type PlatformAIBudgetStatus,
} from '@/server/actions/ai-economics';

function fmtUsd(n: number) {
    if (n >= 1) return `$${n.toFixed(2)}`;
    if (n >= 0.01) return `$${n.toFixed(3)}`;
    return `$${n.toFixed(4)}`;
}

function fmtTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
}

export default function AIEconomicsTab() {
    const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('month');
    const [summary, setSummary] = useState<AgentTelemetrySummary | null>(null);
    const [savings, setSavings] = useState<DevToolsSavings | null>(null);
    const [budget, setBudget] = useState<PlatformAIBudgetStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [telRes, savRes, budRes] = await Promise.all([
                    getAgentTelemetrySummary(period),
                    getDevToolsSavings(),
                    getPlatformAIBudgetStatus(),
                ]);
                if (telRes.success) setSummary(telRes.data);
                if (savRes.success) setSavings(savRes.data);
                if (budRes.success) setBudget(budRes.data);
                if (!telRes.success) setError(telRes.error);
            } catch {
                setError('Failed to load AI economics data');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [period]);

    const isBudgetAlert = budget && (budget.todayCostUsd >= budget.dailyBudget || budget.agentsOverThreshold.length > 0);

    return (
        <div className="space-y-8 p-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-purple-500" />
                        AI Economics
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Platform AI spend + dev tool savings</p>
                </div>
                <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">Last 7 days</SelectItem>
                        <SelectItem value="month">Last 30 days</SelectItem>
                        <SelectItem value="quarter">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {/* ─── Section A: Platform AI Spend ─── */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    A — Platform AI Spend
                </h3>

                {/* Budget bar */}
                {budget && (
                    <Card className={isBudgetAlert ? 'border-orange-400' : ''}>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium flex items-center gap-1.5">
                                    {isBudgetAlert && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                    Today: <span className="font-bold">{fmtUsd(budget.todayCostUsd)}</span>
                                    <span className="text-muted-foreground">/ ${budget.dailyBudget} daily budget</span>
                                </span>
                                <Badge variant={isBudgetAlert ? 'destructive' : 'secondary'}>
                                    {budget.percentUsed}%
                                </Badge>
                            </div>
                            <Progress value={Math.min(budget.percentUsed, 100)} className="h-2" />
                            {budget.agentsOverThreshold.length > 0 && (
                                <p className="text-xs text-orange-600 mt-1.5">
                                    Over ${budget.agentsOverThreshold[0].costUsd.toFixed(0)}/agent threshold:&nbsp;
                                    {budget.agentsOverThreshold.map(a => a.agentName).join(', ')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        {
                            label: 'Total Cost',
                            value: loading ? '—' : fmtUsd(summary?.totalCostUsd ?? 0),
                            sub: 'AI inference spend',
                            icon: <DollarSign className="h-4 w-4 text-green-500" />,
                        },
                        {
                            label: 'Total Tokens',
                            value: loading ? '—' : fmtTokens(summary?.totalTokens ?? 0),
                            sub: 'Input + output',
                            icon: <Zap className="h-4 w-4 text-yellow-500" />,
                        },
                        {
                            label: 'Invocations',
                            value: loading ? '—' : (summary?.totalInvocations ?? 0).toLocaleString(),
                            sub: 'Agent runs tracked',
                            icon: <Bot className="h-4 w-4 text-blue-500" />,
                        },
                    ].map(({ label, value, sub, icon }) => (
                        <Card key={label}>
                            <CardHeader className="pb-1 pt-4">
                                <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    {icon} {label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-2xl font-bold">{value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Budget projection */}
                {summary && (
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <div className="flex gap-8 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Daily avg</span>
                                    <p className="font-semibold">{fmtUsd(summary.budgetStatus.dailyAvg)}/day</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Projected monthly</span>
                                    <p className="font-semibold">{fmtUsd(summary.budgetStatus.projectedMonthly)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* By Agent table */}
                {summary && summary.byAgent.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2 pt-4">
                            <CardTitle className="text-sm">By Agent</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-muted-foreground border-b">
                                        <th className="text-left pb-1 font-medium">Agent</th>
                                        <th className="text-right pb-1 font-medium">Cost</th>
                                        <th className="text-right pb-1 font-medium">Tokens</th>
                                        <th className="text-right pb-1 font-medium">Runs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.byAgent.map((a) => (
                                        <tr key={a.agentName} className="border-b last:border-0">
                                            <td className="py-1.5 font-medium">{a.agentName}</td>
                                            <td className="py-1.5 text-right tabular-nums">{fmtUsd(a.costUsd)}</td>
                                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtTokens(a.tokens)}</td>
                                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{a.invocations}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {/* By Model table */}
                {summary && summary.byModel.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2 pt-4">
                            <CardTitle className="text-sm">By Model</CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs text-muted-foreground border-b">
                                        <th className="text-left pb-1 font-medium">Model</th>
                                        <th className="text-right pb-1 font-medium">Cost</th>
                                        <th className="text-right pb-1 font-medium">Tokens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.byModel.map((m) => (
                                        <tr key={m.model} className="border-b last:border-0">
                                            <td className="py-1.5 font-mono text-xs">{m.model}</td>
                                            <td className="py-1.5 text-right tabular-nums">{fmtUsd(m.costUsd)}</td>
                                            <td className="py-1.5 text-right tabular-nums text-muted-foreground">{fmtTokens(m.tokens)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {!loading && summary?.totalInvocations === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No agent telemetry recorded for this period yet.
                    </p>
                )}
            </section>

            {/* ─── Section B: Dev Tools Savings ─── */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    B — Dev Tool Savings
                </h3>

                {savings && (
                    <>
                        {/* Total savings callout */}
                        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20">
                            <CardContent className="pt-4 pb-4">
                                <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1.5">
                                    <TrendingUp className="h-4 w-4" />
                                    Total AI savings this cycle
                                </p>
                                <p className="text-3xl font-bold text-green-800 dark:text-green-300 mt-1">
                                    {fmtUsd(savings.totalSavingsUsd)}
                                </p>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            {/* GLM card */}
                            <Card>
                                <CardHeader className="pb-2 pt-4">
                                    <CardTitle className="text-sm flex items-center gap-1.5">
                                        <Zap className="h-4 w-4 text-blue-500" />
                                        GLM / z.ai DevPack
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4 space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>{fmtTokens(savings.glm.used)} used</span>
                                            <span>{savings.glm.percentUsed}%</span>
                                        </div>
                                        <Progress value={Math.min(savings.glm.percentUsed, 100)} className="h-2" />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {savings.glm.daysUntilReset}d until reset · limit {fmtTokens(savings.glm.limit)}
                                        </p>
                                    </div>
                                    <div className="border-t pt-2">
                                        <p className="text-xs text-muted-foreground">~saved vs Anthropic</p>
                                        <p className="text-lg font-bold text-green-700">{fmtUsd(savings.glm.savedVsAnthropic)}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* jcodemunch card */}
                            <Card>
                                <CardHeader className="pb-2 pt-4">
                                    <CardTitle className="text-sm flex items-center gap-1.5">
                                        <Code2 className="h-4 w-4 text-purple-500" />
                                        jcodemunch AST
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4 space-y-3">
                                    <div>
                                        <p className="text-2xl font-bold">{fmtTokens(savings.jcodemunch.totalTokensSaved)}</p>
                                        <p className="text-xs text-muted-foreground">tokens saved (lifetime)</p>
                                    </div>
                                    <div className="border-t pt-2">
                                        <p className="text-xs text-muted-foreground">~cost avoidance</p>
                                        <p className="text-lg font-bold text-green-700">{fmtUsd(savings.jcodemunch.estimatedSavingsUsd)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}

                {loading && !savings && (
                    <Card>
                        <CardContent className="pt-4 pb-4">
                            <p className="text-sm text-muted-foreground">Loading dev tool savings...</p>
                        </CardContent>
                    </Card>
                )}
            </section>

            {/* ─── Section C: Quick Links ─── */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    C — Quick Links
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Anthropic Console', url: 'https://console.anthropic.com/settings/usage', desc: 'API usage + billing' },
                        { label: 'z.ai Dashboard', url: 'https://api.z.ai', desc: 'GLM DevPack usage' },
                        { label: 'OpenAI Usage', url: 'https://platform.openai.com/usage', desc: 'OpenAI API spend' },
                    ].map(({ label, url, desc }) => (
                        <a
                            key={label}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                        >
                            <p className="text-sm font-medium flex items-center gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                {label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                        </a>
                    ))}
                </div>
            </section>
        </div>
    );
}
