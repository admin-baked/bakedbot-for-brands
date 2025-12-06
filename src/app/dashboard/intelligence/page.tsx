import { Suspense } from 'react';
import { getCategoryBenchmarks, getBrandRetailers } from './actions/benchmarks';
import { PriceComparisonChart } from './components/price-comparison-chart';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LineChart, Search, MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default async function IntelligencePage() {
    // In a real app, brandId comes from auth/context
    const brandId = '10982'; // Hardcoded for demo
    // Fetch data in parallel
    const [benchmarks, retailers] = await Promise.all([
        getCategoryBenchmarks(brandId),
        getBrandRetailers('Baked Brand') // Example brand name
    ]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Competitive Intelligence (Ezal)</h1>
                    <p className="text-muted-foreground">Market benchmarking and availability tracking.</p>
                </div>
                <Button variant="outline">
                    <Search className="mr-2 h-4 w-4" />
                    Deep Search
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-4 mb-8">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LineChart className="h-5 w-5" /> Market Pulse
                        </CardTitle>
                        <CardDescription className="text-indigo-100">
                            Overall Market Health
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">Bullish</div>
                        <p className="text-sm opacity-80 mt-1">Prices up 2% this week</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="pricing" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="pricing">Price Benchmarking</TabsTrigger>
                    <TabsTrigger value="coverage">Market Coverage</TabsTrigger>
                </TabsList>

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
