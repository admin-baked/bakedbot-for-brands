import { getTreasuryOverview } from '@/app/actions/treasury';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function TreasuryConsolePage() {
    const { success, data } = await getTreasuryOverview();

    if (!success || !data) {
        return (
            <div className="p-8 text-destructive">
                <h1 className="text-2xl font-bold">Error Loading Treasury</h1>
                <p>Could not fetch treasury configuration.</p>
            </div>
        );
    }

    const { policy, strategies, snapshot } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Treasury Console</h1>
                    <p className="text-muted-foreground">Internal Autonomous Treasury Management</p>
                </div>
                <Badge variant={snapshot.runwayMonths < 12 ? "destructive" : "outline"} className="text-lg px-4 py-1">
                    Runway: {snapshot.runwayMonths.toFixed(1)} Months
                </Badge>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Portfolio (Mock)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${snapshot.totalPortfolioUsd.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Across all managed venues</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Risk Bucket Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-green-600 font-bold">Green: {snapshot.riskBucketUsagePct.green}% <span className="text-muted-foreground font-normal">/ {policy.risk_buckets.green}%</span></span>
                            <span className="text-yellow-600 font-bold">Yellow: {snapshot.riskBucketUsagePct.yellow}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                            <div style={{ width: `${(snapshot.riskBucketUsagePct.green / 20) * 100}%` }} className="bg-green-500 h-full" />
                            <div style={{ width: `${(snapshot.riskBucketUsagePct.yellow / 20) * 100}%` }} className="bg-yellow-500 h-full" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{strategies.filter(s => s.status === 'running').length}</div>
                        <p className="text-xs text-muted-foreground">of {strategies.length} configured</p>
                    </CardContent>
                </Card>
            </div>

            {/* Strategy Registry */}
            <Card>
                <CardHeader>
                    <CardTitle>Strategy Registry</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Venue</TableHead>
                                <TableHead>Risk Bucket</TableHead>
                                <TableHead>Target Allocation</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {strategies.map((strat) => (
                                <TableRow key={strat.id}>
                                    <TableCell className="font-mono text-xs">{strat.id}</TableCell>
                                    <TableCell>{strat.name}</TableCell>
                                    <TableCell className="capitalize">{strat.venue}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            strat.risk_bucket === 'green' ? 'border-green-500 text-green-600' :
                                                strat.risk_bucket === 'yellow' ? 'border-yellow-500 text-yellow-600' :
                                                    'border-red-500 text-red-600'
                                        }>
                                            {strat.risk_bucket}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{strat.target_allocation_pct}%</TableCell>
                                    <TableCell>
                                        <Badge variant={strat.status === 'running' ? 'default' : 'secondary'}>
                                            {strat.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
