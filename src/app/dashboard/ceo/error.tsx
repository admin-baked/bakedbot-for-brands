'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error boundary for the CEO dashboard segment.
 * Catches server component rendering errors and prevents the infinite
 * retry loop that occurs when Next.js RSC POST requests return 500.
 */
export default function CeoError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[CEO Dashboard] Server component error:', error.message, error.digest);
    }, [error]);

    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="max-w-md text-center space-y-4">
                <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                </div>
                <h2 className="text-lg font-semibold">Dashboard temporarily unavailable</h2>
                <p className="text-sm text-muted-foreground">
                    A server error occurred. This is usually transient — try refreshing.
                </p>
                {error.digest && (
                    <p className="text-xs text-muted-foreground font-mono">
                        Digest: {error.digest}
                    </p>
                )}
                <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Hard Refresh
                    </Button>
                    <Button onClick={reset}>
                        Try Again
                    </Button>
                </div>
            </div>
        </div>
    );
}
