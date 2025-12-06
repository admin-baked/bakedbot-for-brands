'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EzalInsight } from '@/types/ezal-scraper';
import { Loader2, TrendingUp, TrendingDown, AlertCircle, ShoppingBag, CheckCircle } from 'lucide-react';

export interface EzalInsightsFeedProps {
    tenantId: string;
}

export function EzalInsightsFeed({ tenantId }: EzalInsightsFeedProps) {
    const [insights, setInsights] = useState<EzalInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await fetch(`/api/ezal/insights?tenantId=${tenantId}&limit=20`);
                const json = await res.json();
                if (json.success) {
                    setInsights(json.data);
                }
            } catch (error) {
                console.error('Failed to fetch insights', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, [tenantId]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'price_drop': return <TrendingDown className="h-4 w-4 text-green-500" />;
            case 'price_increase': return <TrendingUp className="h-4 w-4 text-red-500" />;
            case 'out_of_stock': return <AlertCircle className="h-4 w-4 text-orange-500" />;
            case 'back_in_stock': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'new_product': return <ShoppingBag className="h-4 w-4 text-blue-500" />;
            default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Recent Insights</CardTitle>
                <CardDescription>Real-time competitive events</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : insights.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent insights.</p>
                ) : (
                    <div className="space-y-4">
                        {insights.map((insight) => (
                            <div key={insight.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                                <div className="mt-1 rounded-full bg-slate-100 p-2 dark:bg-slate-800">
                                    {getIcon(insight.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium leading-none">
                                            {insight.brandName}
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(insight.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {insight.type === 'price_drop' && `Price dropped from ${formatCurrency(insight.previousValue as number || 0)} to ${formatCurrency(insight.currentValue as number || 0)}`}
                                        {insight.type === 'price_increase' && `Price increased from ${formatCurrency(insight.previousValue as number || 0)} to ${formatCurrency(insight.currentValue as number || 0)}`}
                                        {insight.type === 'out_of_stock' && 'Product is now out of stock'}
                                        {insight.type === 'new_product' && `New product detected: ${formatCurrency(insight.currentValue as number || 0)}`}
                                        {insight.type === 'back_in_stock' && 'Product is back in stock'}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase">
                                        {insight.severity}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
