'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function CampaignsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[CampaignsError]', error);
    }, [error]);

    return (
        <div className="flex items-center justify-center py-16">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <CardTitle>Campaigns unavailable</CardTitle>
                    </div>
                    <CardDescription>
                        There was a problem loading the Campaigns page. This is usually temporary.
                        {error.digest && (
                            <span className="block mt-1 text-xs text-muted-foreground">
                                Reference: {error.digest}
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={reset} className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try again
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
