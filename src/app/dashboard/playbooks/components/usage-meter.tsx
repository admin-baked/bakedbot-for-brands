'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Zap, MessageCircle } from 'lucide-react';

export function UsageMeter() {
    // Mock Data
    const usage = {
        messages: 750,
        limitMessages: 1000,
        recommendations: 320,
        apiCalls: 1540
    };

    const percentage = (usage.messages / usage.limitMessages) * 100;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Usage & Metering
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <MessageCircle className="h-3 w-3" /> Messages
                        </span>
                        <span className="font-medium">{usage.messages} / {usage.limitMessages}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" /> AI Recs
                        </span>
                        <p className="text-xl font-bold">{usage.recommendations}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            API Calls
                        </span>
                        <p className="text-xl font-bold">{usage.apiCalls}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
