'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BenchmarkData } from '../actions/benchmarks';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function PriceComparisonChart({ data }: { data: BenchmarkData[] }) {
    if (data.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No benchmarking data available. Sync your menu to see insights.
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((item) => (
                <Card key={item.category} className="overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            {item.category}
                        </CardTitle>
                        <CardDescription className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">${item.yourPrice}</span>
                            <span className="text-xs text-muted-foreground">avg. your price</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Market Average</span>
                                <span className="font-medium">${item.avgMarketPrice}</span>
                            </div>

                            <div className="relative pt-2">
                                {/* Simple visual bar */}
                                <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                                    <div
                                        className="bg-primary h-full"
                                        style={{ width: `${Math.min((item.yourPrice / (item.yourPrice + item.avgMarketPrice)) * 100, 100)}%` }}
                                    />
                                    <div
                                        className="bg-slate-300 h-full"
                                        style={{ width: `${Math.min((item.avgMarketPrice / (item.yourPrice + item.avgMarketPrice)) * 100, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                                    <span>You</span>
                                    <span>Market</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t flex items-center gap-2">
                                {item.difference > 0 ? (
                                    <>
                                        <TrendingUp className="h-4 w-4 text-red-500" />
                                        <span className="text-sm text-red-600 font-medium">
                                            {item.difference}% higher
                                        </span>
                                    </>
                                ) : item.difference < 0 ? (
                                    <>
                                        <TrendingDown className="h-4 w-4 text-green-500" />
                                        <span className="text-sm text-green-600 font-medium">
                                            {Math.abs(item.difference)}% lower
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Minus className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm text-yellow-600 font-medium">
                                            Market parity
                                        </span>
                                    </>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                    vs market
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
