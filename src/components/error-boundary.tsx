'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
    clearDeploymentReloadMark,
    isDeploymentMismatchError,
    shouldAttemptDeploymentReload,
    startDeploymentReload,
} from '@/lib/deployment-mismatch';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    isDeploymentMismatch: boolean;
    reloadAttempted: boolean;
}

export class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null, isDeploymentMismatch: false, reloadAttempted: false };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        const isDeploymentMismatch = isDeploymentMismatchError(error);
        return { hasError: true, error, isDeploymentMismatch };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const isDeploymentMismatch = isDeploymentMismatchError(error);

        // Log error to monitoring service
        logger.error('Error boundary caught error:', { error, errorInfo, isDeploymentMismatch });

        // Log critical errors to Firestore for agent monitoring
        if (typeof window !== 'undefined' && !isDeploymentMismatch) {
            try {
                // Import dynamically to avoid build issues
                import('@/firebase/client')
                    .then(({ db }) => {
                        if (db) {
                            db.collection('client_errors').add({
                                message: error.message,
                                stack: error.stack,
                                componentStack: errorInfo.componentStack,
                                url: window.location.href,
                                userAgent: navigator.userAgent,
                                timestamp: new Date(),
                                isDeploymentMismatch
                            }).catch(() => {
                                // Fail silently if Firestore is unavailable
                            });
                        }
                    })
                    .catch(() => { });
            } catch (e) {
                // Ignore logging failures
            }
        }

        // For deployment mismatches, attempt automatic reload (once)
        if (isDeploymentMismatch && typeof window !== 'undefined') {
            if (shouldAttemptDeploymentReload(window.sessionStorage)) {
                logger.info('Deployment mismatch detected, reloading fresh assets', {
                    message: error.message,
                });
                void startDeploymentReload();
                return;
            }

            this.setState({ reloadAttempted: true });
        }

        // Track in analytics
        if (typeof window !== 'undefined') {
            (window as any).gtag?.('event', 'exception', {
                description: error.message,
                fatal: false,
                deployment_mismatch: isDeploymentMismatch,
            });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, isDeploymentMismatch: false, reloadAttempted: false });
    };

    handleHardReload = () => {
        if (typeof window !== 'undefined') {
            clearDeploymentReloadMark(window.sessionStorage);
            void startDeploymentReload({ force: true });
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Deployment mismatch UI - encourage reload
            if (this.state.isDeploymentMismatch) {
                return (
                    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                        <Card className="max-w-lg w-full border-blue-200">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <RefreshCw className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <CardTitle className="text-xl">Update Available</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    A new version of BakedBot has been deployed. Please refresh to load the latest updates.
                                </p>

                                {this.state.reloadAttempted && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                                        <p className="text-sm text-amber-800">
                                            If the issue persists after refreshing, try clearing your browser cache
                                            (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac).
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={this.handleHardReload}
                                        variant="default"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Refresh Now
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );
            }

            // Standard error UI
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
