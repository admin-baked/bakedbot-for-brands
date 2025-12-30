'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ResearchTab() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Deep Research</h2>
                    <p className="text-muted-foreground">
                        Comprehensive web analysis and market intelligence reports.
                    </p>
                </div>
                <Button asChild className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/dashboard/research">
                        <Globe className="h-4 w-4" />
                        Open Research Dashboard
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Research Tasks</CardTitle>
                    <CardDescription>View and manage Deep Research tasks.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Sparkles className="h-12 w-12 text-emerald-600 mb-4 opacity-50" />
                    <p className="mb-4">The Deep Research module is a standalone experience.</p>
                    <Button variant="outline" asChild>
                         <Link href="/dashboard/research">Go to /dashboard/research</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
