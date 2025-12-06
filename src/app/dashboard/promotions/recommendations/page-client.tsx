'use client';

import { useState } from 'react';
import type { PromotionRecommendation } from './actions';
import { createPromotion } from './actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tag, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PromoPageProps {
    recommendations: PromotionRecommendation[];
}

export default function PromoRecommendations({ recommendations }: PromoPageProps) {
    const { toast } = useToast();
    const [processing, setProcessing] = useState<string | null>(null);

    const handleActivate = async (rec: PromotionRecommendation) => {
        setProcessing(rec.productId);
        try {
            await createPromotion(rec.productId, rec.suggestedDiscount || 15);
            toast({ title: 'Promotion Active', description: `Created 20% off coupon for ${rec.productName}` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create promotion.' });
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Smart Promotions</h1>
                <p className="text-muted-foreground">AI-driven discounts to optimize inventory velocity.</p>
            </div>

            {recommendations.length === 0 ? (
                <Card className="bg-muted/20 border-dashed">
                    <CardContent className="text-center py-12">
                        <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-medium">Inventory Healthy</h3>
                        <p className="text-muted-foreground">No slow-moving products detected requiring action.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {recommendations.map(rec => (
                        <Card key={rec.productId} className="flex flex-col border-l-4 border-l-yellow-400 shadow-sm hover:shadow-md transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                        {rec.reason}
                                    </Badge>
                                </div>
                                <CardTitle className="mt-2 text-lg">{rec.productName}</CardTitle>
                                <CardDescription>Stock: {rec.currentStock} units ({rec.daysSupply} days)</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="space-y-4">
                                    <div className="flex gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">Velocity</span>
                                            <span className="font-medium">{rec.velocity}/day</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">Target</span>
                                            <span className="font-medium">{rec.suggestedDiscount}% Off</span>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm flex items-start gap-2">
                                        <Tag className="h-4 w-4 mt-1 flex-shrink-0" />
                                        <p>Recommendation: Run a <strong>{rec.suggestedDiscount}% flash sale</strong> to clear {Math.round(rec.currentStock * 0.3)} units.</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    onClick={() => handleActivate(rec)}
                                    disabled={!!processing}
                                >
                                    {processing === rec.productId ? 'Creating...' : `Activate ${rec.suggestedDiscount}% Promo`}
                                    {!processing && <ArrowRight className="ml-2 h-4 w-4" />}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
