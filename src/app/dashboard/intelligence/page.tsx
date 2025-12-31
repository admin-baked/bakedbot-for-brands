import { Suspense } from 'react';
import { getCategoryBenchmarks, getBrandRetailers } from './actions/benchmarks';
import { PriceComparisonChart } from './components/price-comparison-chart';
import { CompetitorSetupWizard } from './components/competitor-setup-wizard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LineChart, Search, MapPin, Store, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { listCompetitors } from '@/server/services/ezal/competitor-manager';
import { generateCompetitorReport } from '@/server/services/ezal/report-generator';

export default async function IntelligencePage() {
    let brandId = '';
    try {
        const user = await requireUser();
        brandId = user.uid;
    } catch {
        redirect('/dashboard');
    }

    // Fetch data in parallel
    const [benchmarks, retailers, competitors] = await Promise.all([
        getCategoryBenchmarks(brandId),
        getBrandRetailers(brandId),
        listCompetitors(brandId, { active: true })
    ]);

    // Generate Report if competitors exist
    const reportMarkdown = competitors.length > 0 
        ? await generateCompetitorReport(brandId) 
        : null;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Competitive Intelligence (Ezal)</h1>
                    <p className="text-muted-foreground">Market benchmarking and availability tracking.</p>
                </div>
                <div className="flex gap-2">
                    <CompetitorSetupWizard hasCompetitors={competitors.length > 0} />
                    <Button variant="outline">
                        <Search className="mr-2 h-4 w-4" />
                        Deep Search
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4 mb-8">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LineChart className="h-5 w-5" /> Market Pulse
                        </CardTitle>
                        <CardDescription className="text-indigo-100">
                            Your Price Position
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {benchmarks.length === 0 ? (
                            <>
                                <div className="text-3xl font-bold">No Data</div>
                                <p className="text-sm opacity-80 mt-1">Add products to see insights</p>
                            </>
                        ) : (() => {
                            const avgDiff = benchmarks.reduce((sum, b) => sum + b.difference, 0) / benchmarks.length;
                            const status = avgDiff > 5 ? 'Premium' : avgDiff < -5 ? 'Value' : 'Market Parity';
                            const trend = avgDiff > 0 ? `+${avgDiff.toFixed(1)}%` : `${avgDiff.toFixed(1)}%`;
                            return (
                                <>
                                    <div className="text-3xl font-bold">{status}</div>
                                    <p className="text-sm opacity-80 mt-1">{trend} vs market avg</p>
                                </>
                            );
                        })()}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Store className="h-5 w-5" /> Competitors Tracked
                        </CardTitle>
                        <CardDescription>Active Discovery Agents</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{competitors.length}</div>
                        <p className="text-sm text-muted-foreground mt-1">Daily updates enabled</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue={competitors.length > 0 ? "analysis" : "pricing"} className="space-y-6">
                <TabsList>
                    <TabsTrigger value="analysis">Strategic Analysis</TabsTrigger>
                    <TabsTrigger value="pricing">Price Benchmarking</TabsTrigger>
                    <TabsTrigger value="coverage">Market Coverage</TabsTrigger>
                </TabsList>

                <TabsContent value="analysis" className="space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600" /> Daily Intelligence Report
                            </CardTitle>
                            <CardDescription>
                                AI-generated analysis of margin opportunities, stockouts, and competitive positioning.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {reportMarkdown ? (
                                <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 p-6 rounded-lg whitespace-pre-wrap font-mono text-sm leading-relaxed border">
                                    {reportMarkdown}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-medium mb-2">No Analysis Available</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                                        Configure competitors to start generating daily strategic reports.
                                    </p>
                                    <CompetitorSetupWizard hasCompetitors={false} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Price Benchmarking</h2>
                        <p className="text-muted-foreground mb-4">How your product pricing compares to the market average by category.</p>
                        <Suspense fallback={<div>Loading market data...</div>}>
                            <PriceComparisonChart data={benchmarks} />
                        </Suspense>
                    </div>
                </TabsContent>

                <TabsContent value="coverage" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dispensary Finder</CardTitle>
                            <CardDescription>Retailers currently stocking your products (via CannMenus).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {retailers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-8 text-center">No retailers found.</p>
                                ) : (
                                    retailers.map((store, i) => (
                                        <div key={i} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                                            <div className="flex gap-4">
                                                <div className="bg-primary/10 p-2 rounded-full h-fit">
                                                    <Store className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold">{store.name}</div>
                                                    <div className="flex items-center text-sm text-muted-foreground">
                                                        <MapPin className="h-3 w-3 mr-1" /> {store.address}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">{store.stockCount} SKUs</div>
                                                <div className="text-xs text-muted-foreground">{store.distance} miles away</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
