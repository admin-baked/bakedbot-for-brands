'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, RefreshCcw, Wrench } from 'lucide-react';

import { runAgentToolBenchmarkAction, type AgentToolBenchmarkReport } from '../actions/tool-benchmark-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

function formatNumber(value: number, digits = 2): string {
    return Number.isFinite(value) ? value.toFixed(digits) : '0.00';
}

function formatInt(value: number): string {
    return Number.isFinite(value) ? value.toFixed(0) : '0';
}

export default function AgentToolBenchmarkTab() {
    const [days, setDays] = useState(30);
    const [maxEvents, setMaxEvents] = useState(2000);
    const [topTools, setTopTools] = useState(10);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<AgentToolBenchmarkReport | null>(null);

    const runBenchmark = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await runAgentToolBenchmarkAction({ days, maxEvents, topTools });
            setReport(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to run benchmark');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runBenchmark().catch(() => undefined);
    }, []);

    const kpiCards = useMemo(() => {
        if (!report) {
            return [];
        }

        return [
            {
                label: 'Invocations',
                value: formatInt(report.eventsInWindow),
                detail: `${report.windowDays}-day window`,
            },
            {
                label: 'Avg Tokens / Invocation',
                value: formatInt(report.avgTokensPerInvocation),
                detail: `Definition ${formatInt(report.avgDefinitionTokensPerInvocation)} · Results ${formatInt(report.avgResultTokensPerInvocation)}`,
            },
            {
                label: 'Avg Tool Calls / Invocation',
                value: formatNumber(report.avgToolCallsPerInvocation),
                detail: `Dead-end loops ${formatNumber(report.deadEndLoopsPerInvocation)}`,
            },
            {
                label: 'Tool Error Rate',
                value: `${formatNumber(report.toolErrorRate)}%`,
                detail: `Selection misses ${formatNumber(report.selectionMissesPerInvocation)} / inv`,
            },
            {
                label: 'Param Errors / Invocation',
                value: formatNumber(report.paramErrorsPerInvocation),
                detail: `Avg latency ${formatInt(report.avgLatencyMs)} ms`,
            },
            {
                label: 'Success Rate',
                value: `${formatNumber(report.successRate)}%`,
                detail: `${report.eventsScanned} events scanned`,
            },
            {
                label: 'LanceDB Queries / Invocation',
                value: formatNumber(report.lancedbQueriesPerInvocation),
                detail: `Empty ${formatNumber(report.lancedbEmptyResultRate)}% · Rerank ${formatNumber(report.lancedbRerankRate)}%`,
            },
            {
                label: 'Retrieval Calls / Invocation',
                value: formatNumber(report.retrievalCallsPerInvocation),
                detail: `Zero ${formatNumber(report.retrievalZeroResultRate)}% · Follow-up ${formatNumber(report.retrievalFollowupRate)}%`,
            },
        ];
    }, [report]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Agent Tool Benchmarking</h2>
                    <p className="text-muted-foreground">
                        Measure token bloat, tool accuracy, and orchestration efficiency across Super User agent telemetry.
                    </p>
                </div>
                <Button onClick={runBenchmark} disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running...
                        </>
                    ) : (
                        <>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Run Benchmark
                        </>
                    )}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Benchmark Controls
                    </CardTitle>
                    <CardDescription>
                        Tune lookback window and dataset size for KPI analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="benchmark-days">Lookback (days)</Label>
                        <Input
                            id="benchmark-days"
                            type="number"
                            min={1}
                            max={365}
                            value={days}
                            onChange={(event) => setDays(Number(event.target.value || 30))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="benchmark-max-events">Max telemetry events</Label>
                        <Input
                            id="benchmark-max-events"
                            type="number"
                            min={100}
                            max={10000}
                            value={maxEvents}
                            onChange={(event) => setMaxEvents(Number(event.target.value || 2000))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="benchmark-top-tools">Top tools to display</Label>
                        <Input
                            id="benchmark-top-tools"
                            type="number"
                            min={3}
                            max={30}
                            value={topTools}
                            onChange={(event) => setTopTools(Number(event.target.value || 10))}
                        />
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Benchmark failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {report && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {kpiCards.map((card) => (
                            <Card key={card.label}>
                                <CardHeader className="pb-2">
                                    <CardDescription>{card.label}</CardDescription>
                                    <CardTitle className="text-2xl">{card.value}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">{card.detail}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recommendations</CardTitle>
                                <CardDescription>
                                    Actionable next steps based on benchmark thresholds.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {report.recommendations.map((recommendation, index) => (
                                        <li key={`${recommendation}-${index}`} className="flex items-start gap-2 text-sm">
                                            <Wrench className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                            <span>{recommendation}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Top Tools</CardTitle>
                                <CardDescription>Most frequently used tools in the selected window.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {report.topTools.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No tool usage found in this window.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {report.topTools.map((tool) => (
                                            <div key={tool.name} className="flex items-center justify-between rounded border p-2 text-sm">
                                                <span className="font-medium">{tool.name}</span>
                                                <span className="text-muted-foreground">{tool.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>



                    <Card>
                        <CardHeader>
                            <CardTitle>Retrieval Contract Health</CardTitle>
                            <CardDescription>
                                Audits retrieve_context/hydrate_records behavior against payload and hydration efficiency goals.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded border p-3">
                                    <p className="text-xs text-muted-foreground">Avg retrieval latency</p>
                                    <p className="text-sm font-medium">{formatInt(report.retrievalLatencyAvgMs)} ms</p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs text-muted-foreground">Payload tokens / invocation</p>
                                    <p className="text-sm font-medium">{formatInt(report.retrievalPayloadTokensPerInvocation)}</p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs text-muted-foreground">Hydrated records / invocation</p>
                                    <p className="text-sm font-medium">{formatNumber(report.retrievalHydrationCountPerInvocation)}</p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs text-muted-foreground">Top-k return rate</p>
                                    <p className="text-sm font-medium">{formatNumber(report.retrievalTopKReturnRate)}%</p>
                                </div>
                            </div>
                            <div className="grid gap-4 xl:grid-cols-2">
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Domain breakdown</p>
                                    <div className="space-y-2">
                                        {Object.entries(report.retrievalDomainBreakdown).length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No retrieval metrics recorded.</p>
                                        ) : Object.entries(report.retrievalDomainBreakdown).map(([domain, count]) => (
                                            <div key={domain} className="flex items-center justify-between rounded border p-2 text-sm">
                                                <span>{domain}</span>
                                                <span className="text-muted-foreground">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strategy breakdown</p>
                                    <div className="space-y-2">
                                        {Object.entries(report.retrievalStrategyBreakdown).length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No retrieval metrics recorded.</p>
                                        ) : Object.entries(report.retrievalStrategyBreakdown).map(([strategy, count]) => (
                                            <div key={strategy} className="flex items-center justify-between rounded border p-2 text-sm">
                                                <span>{strategy}</span>
                                                <span className="text-muted-foreground">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                    <Card>
                        <CardHeader>
                            <CardTitle>LanceDB Retrieval Health</CardTitle>
                            <CardDescription>
                                Retrieval-plane quality indicators for vector/FTS/hybrid routing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <div className="rounded border p-3">
                                    <p className="text-xs text-muted-foreground">Mode Mix (vector / fts / hybrid)</p>
                                    <p className="text-sm font-medium">
                                        {formatInt(report.lancedbModeMix.vector)} / {formatInt(report.lancedbModeMix.fts)} / {formatInt(report.lancedbModeMix.hybrid)}
                                    </p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs text-muted-foreground">Candidate consumption rate</p>
                                    <p className="text-sm font-medium">{formatNumber(report.lancedbConsumptionRate)}%</p>
                                </div>
                                <div className="rounded border p-3">
                                    <p className="text-xs text-muted-foreground">Filter selectivity avg</p>
                                    <p className="text-sm font-medium">{formatNumber(report.lancedbFilterSelectivityAvg * 100)}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>By Agent</CardTitle>
                            <CardDescription>
                                Invocation-weighted profile of tool usage and error behavior by agent.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {report.byAgent.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No agent telemetry found in this window.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[700px] text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                                <th className="py-2 pr-4 font-medium">Agent</th>
                                                <th className="py-2 pr-4 font-medium">Invocations</th>
                                                <th className="py-2 pr-4 font-medium">Avg Tokens</th>
                                                <th className="py-2 pr-4 font-medium">Avg Tool Calls</th>
                                                <th className="py-2 pr-4 font-medium">Tool Error Rate</th>
                                                <th className="py-2 pr-4 font-medium">Capability Utilization</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.byAgent.map((row) => (
                                                <tr key={row.agent} className="border-b last:border-0">
                                                    <td className="py-2 pr-4 font-medium">{row.agent}</td>
                                                    <td className="py-2 pr-4">{formatInt(row.invocations)}</td>
                                                    <td className="py-2 pr-4">{formatInt(row.avgTokens)}</td>
                                                    <td className="py-2 pr-4">{formatNumber(row.avgToolCalls)}</td>
                                                    <td className="py-2 pr-4">{formatNumber(row.toolErrorRate)}%</td>
                                                    <td className="py-2 pr-4">
                                                        {row.avgCapabilityUtilization === null
                                                            ? 'n/a'
                                                            : `${formatNumber(row.avgCapabilityUtilization * 100)}%`}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
