import { requireUser } from '@/server/auth/auth';
import { loadTreasuryMemory } from '@/server/treasury/memory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, TrendingUp, Wallet, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CeoTreasuryPage() {
    // Ensure only Super Admins/Owners can see this
    await requireUser(['owner']);

    const memory = await loadTreasuryMemory();
    const { treasury_profile, runway_model, allocation_policy, strategy_registry } = memory;

    // Mock calculate current stats (mirroring standard treasury)
    const currentStats = {
        totalPortfolioUsd: 100000,
        cryptoUsd: 12500,
        stableUsd: 87500,
        runwayMonths: 100000 / runway_model.monthly_burn_usd
    };

    const cryptoPct = (currentStats.cryptoUsd / currentStats.totalPortfolioUsd) * 100;
    const isCryptoCapExceeded = cryptoPct > allocation_policy.max_total_crypto_pct;

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">System Treasury</h1>
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                        CEO CONTEXT
                    </Badge>
                </div>
                <p className="text-muted-foreground">
                    Super User view of autonomous capital allocation and risk management.
                </p>
            </div>

            {/* Top KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Liquidity</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${currentStats.totalPortfolioUsd.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {currentStats.runwayMonths.toFixed(1)} months runway
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Crypto Exposure</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${isCryptoCapExceeded ? 'text-red-500' : ''}`}>
                            {cryptoPct.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Max Cap: {allocation_policy.max_total_crypto_pct}%
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Risk Status</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">Normal</div>
                        <p className="text-xs text-muted-foreground">
                            Runway Guard: Active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {strategy_registry.filter(s => s.status === 'running').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {strategy_registry.length} total configured
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Strategy Registry Table */}
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
                                <TableHead>Allocation Target</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {strategy_registry.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-mono text-xs">{s.id}</TableCell>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell className="capitalize">{s.venue}</TableCell>
                                    <TableCell>
                                        <Badge variant={s.risk_bucket === 'red' ? 'destructive' : 'secondary'} className={s.risk_bucket === 'green' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                                            {s.risk_bucket.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{s.target_allocation_pct}%</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${s.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                            <span className="capitalize">{s.status}</span>
                                        </div>
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
