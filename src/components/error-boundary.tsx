'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { logger } from '@/lib/logger';
interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to monitoring service
        logger.error('Error boundary caught error:', { error, errorInfo });

        // TODO: Send to error tracking service (e.g., Sentry, LogRocket)
        if (typeof window !== 'undefined') {
            // Track in analytics
            (window as any).gtag?.('event', 'exception', {
                description: error.message,
                fatal: false,
            });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                    <Card className="max-w-lg w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <CardTitle className="text-xl">Something went wrong</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                We encountered an unexpected error. This has been logged and we'll look into it.
                            </p>

                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="mt-4 p-3 bg-muted rounded-md">
                                    <p className="text-xs font-mono text-destructive mb-2">
                                        {this.state.error.name}: {this.state.error.message}
                                    </p>
                                    <pre className="text-xs overflow-auto max-h-40">
                                        {this.state.error.stack}
                                    </pre>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={this.handleReset}
                                    variant="default"
                                    className="flex-1"
                                >
                                    Try again
                                </Button>
                                <Button
                                    onClick={() => window.location.href = '/dashboard'}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Go to dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Lightweight error fallback for smaller components
 */
export function ErrorFallback({
    error,
    resetError,
}: {
    error: Error;
    resetError: () => void;
}) {
    return (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-sm">Error Loading Component</h3>
                    <p className="text-xs text-muted-foreground">{error.message}</p>
                    <Button
                        onClick={resetError}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        </div>
    );
}
