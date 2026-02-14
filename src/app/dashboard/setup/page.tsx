// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SetupPage() {
    return (
        <div className="container max-w-4xl py-10 space-y-8">
            <div className="flex flex-col gap-2 text-center mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Finalize Your Setup
                </h1>
                <p className="text-xl text-muted-foreground">
                    Complete these few steps to unlock the full power of BakedBot AI.
                </p>
            </div>

            <SetupChecklist />

            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                        Why complete setup?
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                        Linking your POS data and configuring your brand identity allows Smokey (the Budtender)
                        to provide accurate inventory recommendations and market insights.
                    </p>
                    <p>
                        Once complete, this checklist will disappear and be replaced by your performance analytics dashboard.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
