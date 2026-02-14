/**
 * Simulation Results Page
 * 
 * Detailed view of a completed simulation run:
 * - High-level KPI summary (p10/p50/p90)
 * - Calendar Heatmap of daily performance
 * - Drill-down to daily ledgers
 */

// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import { getRun, getDaySummaries } from '../actions';
import { SimRun, SimDaySummary } from '@/types/simulation';
import { format } from 'date-fns';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, DollarSign, ShoppingBag, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    title: 'Simulation Results | BakedBot',
};

export default async function SimulationRunPage({ params }: { params: { runId: string } }) {
    await requireUser(['brand', 'dispensary', 'super_user']);

    // Parallel fetch
    const [run, daySummaries] = await Promise.all([
        getRun(params.runId),
        getDaySummaries(params.runId),
    ]);

    if (!run) {
        notFound();
    }

    const isCompleted = run.status === 'completed';
    const hasWarnings = run.warnings.length > 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/dashboard/simulation"
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground w-fit"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub
                </Link>

                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold tracking-tight">Run Results</h1>
                            <Badge variant={isCompleted ? 'default' : 'secondary'} className="capitalize">
                                {run.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            {run.profile} Scenario • {run.horizonDays} Days • Seed: {run.seed}
                        </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                        <div>Run ID: {run.id}</div>
                        <div>Completed: {run.completedAt ? format(new Date(run.completedAt), 'MMM d, h:mm a') : '-'}</div>
                    </div>
                </div>

                {hasWarnings && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <div className="font-semibold">Simulation Warnings</div>
                            <ul className="list-disc list-inside text-sm mt-1">
                                {run.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Metrics */}
            {isCompleted && run.summaryMetrics && (
                <div className="grid gap-4 md:grid-cols-3">
                    <SummaryCard
                        title="Net Revenue"
                        icon={DollarSign}
                        p50={run.summaryMetrics.netRevenue.p50}
                        p10={run.summaryMetrics.netRevenue.p10}
                        p90={run.summaryMetrics.netRevenue.p90}
                        format={(v) => `$${v.toLocaleString()}`}
                    />
                    <SummaryCard
                        title="Total Orders"
                        icon={ShoppingBag}
                        p50={run.summaryMetrics.orders.p50}
                        p10={run.summaryMetrics.orders.p10}
                        p90={run.summaryMetrics.orders.p90}
                        format={(v) => v.toLocaleString()}
                    />
                    <SummaryCard
                        title="Total Discounts"
                        icon={TrendingUp} // Down is good here?
                        p50={run.summaryMetrics.discountTotal.p50}
                        p10={run.summaryMetrics.discountTotal.p10}
                        p90={run.summaryMetrics.discountTotal.p90}
                        format={(v) => `$${v.toLocaleString()}`}
                    />
                </div>
            )}

            {/* Daily Calendar Heatmap / List */}
            {daySummaries.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" /> Daily Ledger
                        </CardTitle>
                        <CardDescription>
                            Daily performance breakdown. Click a day to view detailed transaction ledger.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                    <TableHead className="text-right">Orders</TableHead>
                                    <TableHead className="text-right">AOV</TableHead>
                                    <TableHead className="text-right">Gross Margin</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {daySummaries.map((day) => (
                                    <TableRow key={day.date}>
                                        <TableCell className="font-medium">
                                            {format(new Date(day.date), 'EEE, MMM d')}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            ${day.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {day.orders}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            ${day.aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                            {day.grossMargin ? `$${day.grossMargin.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/simulation/${run.id}/ledger/${day.date}`}>
                                                    View Ledger
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

interface SummaryCardProps {
    title: string;
    icon: any;
    p50: number;
    p10: number;
    p90: number;
    format: (v: number) => string;
}

function SummaryCard({ title, icon: Icon, p50, p10, p90, format }: SummaryCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{format(p50)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                    Range: {format(p10)} - {format(p90)} (P10-P90)
                </p>
            </CardContent>
        </Card>
    );
}
