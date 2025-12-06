import { Suspense } from 'react';
import { getCategoryBenchmarks } from './actions/benchmarks';
import { PriceComparisonChart } from './components/price-comparison-chart';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LineChart, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function IntelligencePage() {
    // In a real app, brandId comes from auth/context
    const brandId = '10982'; // Hardcoded for demo
    const benchmarks = await getCategoryBenchmarks(brandId); // Using server action directly

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Competitive Intelligence</h1>
                    <p className="text-muted-foreground">Ezal is analyzing the market for you.</p>
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

            <section className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Price Benchmarking</h2>
                    <p className="text-muted-foreground mb-4">How your product pricing compares to the market average by category.</p>
                    <Suspense fallback={<div>Loading market data...</div>}>
                        <PriceComparisonChart data={benchmarks} />
                    </Suspense>
                </div>
            </section>
        </div>
    );
}
