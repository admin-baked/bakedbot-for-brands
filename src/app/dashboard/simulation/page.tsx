export const dynamic = 'force-dynamic';
/**
 * Simulation Hub Page
 * 
 * Central dashboard for "Flight Simulator":
 * - List active scenarios
 * - Show recent runs status
 * - Quick actions to create/compare
 */

import Link from 'next/link';
import { requireUser } from '@/server/auth/auth';
import { getScenarios, getRuns } from './actions';
import { SimScenario, SimRun } from '@/types/simulation';
import { format } from 'date-fns';
import { RunButton } from './client-components';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    History,
    Store,
    Building2,
    Play,
} from 'lucide-react';

export const metadata = {
    title: 'Simulation Mode | BakedBot',
    description: 'Run what-if scenarios for pricing, inventory, and promotions.',
};

export default async function SimulationPage() {
    await requireUser(['brand', 'dispensary', 'owner']);

    // Parallel data fetching
    const [scenarios, runs] = await Promise.all([
        getScenarios(),
        getRuns(),
    ]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        Simulation Mode <Badge variant="secondary" className="text-xs">BETA</Badge>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Flight simulator for your business. Run "what-if" scenarios for the next 90 days.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/dashboard/simulation/new">
                            <Plus className="h-4 w-4 mr-2" /> New Scenario
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Recent Runs (Side Panel) */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" /> Recent Runs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <RecentRunsList runs={runs} />
                    </CardContent>
                    <CardFooter className="justify-center border-t py-4">
                        <Button variant="ghost" size="sm" className="w-full">View All History</Button>
                    </CardFooter>
                </Card>

                {/* Active Scenarios (Main Panel) */}
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold">Saved Scenarios</h2>

                    {scenarios.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid gap-4">
                            {scenarios.map(scenario => (
                                <ScenarioCard key={scenario.id} scenario={scenario} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// Components
// ==========================================

function RecentRunsList({ runs }: { runs: SimRun[] }) {
    if (runs.length === 0) {
        return (
            <div className="p-8 text-center text-sm text-muted-foreground">
                No runs yet.
            </div>
        );
    }

    return (
        <div className="divide-y">
            {runs.slice(0, 5).map(run => {
                const statusColor =
                    run.status === 'completed' ? 'text-green-600 bg-green-50' :
                        run.status === 'failed' ? 'text-red-600 bg-red-50' :
                            'text-blue-600 bg-blue-50';

                return (
                    <div key={run.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <Link href={`/dashboard/simulation/${run.id}`} className="block group">
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className={`${statusColor} capitalize border-0`}>
                                    {run.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(run.createdAt), 'MMM d, h:mm a')}
                                </span>
                            </div>
                            <div className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                                {run.horizonDays}-day Sim: {run.profile}
                            </div>
                            {run.summaryMetrics && (
                                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2 mt-2">
                                    <div>
                                        <span className="font-semibold text-foreground">
                                            ${run.summaryMetrics.netRevenue.p50.toLocaleString()}
                                        </span> Rev
                                    </div>
                                    <div>
                                        <span className="font-semibold text-foreground">
                                            {run.summaryMetrics.orders.p50.toLocaleString()}
                                        </span> Orders
                                    </div>
                                </div>
                            )}
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}

function ScenarioCard({ scenario }: { scenario: SimScenario }) {
    const Icon = scenario.profile === 'DISPENSARY' ? Store : Building2;

    return (
        <Card>
            <CardHeader className="p-6 pb-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-md mt-1">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{scenario.name}</CardTitle>
                            <CardDescription className="line-clamp-1">
                                {scenario.description || 'No description'}
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 pb-4">
                <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">{scenario.horizonDays} Days</Badge>
                    <Badge variant="outline">{scenario.interventions.length} Interventions</Badge>
                    {scenario.interventions.map((inv, i) => (
                        <Badge key={i} variant="outline" className="bg-muted/50">
                            {inv.type === 'PriceChange' ? 'Pricing' :
                                inv.type === 'Promotion' ? 'Promo' :
                                    inv.type === 'TradeSpend' ? 'Trade Spend' : 'Other'}
                        </Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="p-6 pt-0 border-t flex justify-between bg-muted/10 items-center">
                <span className="text-xs text-muted-foreground pt-4">
                    Updated {format(new Date(scenario.updatedAt), 'MMM d, yyyy')}
                </span>
                <div className="flex gap-2 pt-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/simulation/edit/${scenario.id}`}>Edit</Link>
                    </Button>
                    <RunButton scenarioId={scenario.id} />
                </div>
            </CardFooter>
        </Card>
    );
}

function EmptyState() {
    return (
        <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                    <Play className="h-8 w-8 text-muted-foreground ml-1" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Scenarios Created</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    Create your first "what-if" scenario to simulate detailed market outcomes.
                </p>
                <Button asChild>
                    <Link href="/dashboard/simulation/new">Create Scenario</Link>
                </Button>
            </CardContent>
        </Card>
    );
}
