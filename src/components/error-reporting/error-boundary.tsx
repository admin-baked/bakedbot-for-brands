'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Bug, Copy, RefreshCw, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ErrorBoundaryProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function FelishaErrorBoundary({ error, reset }: ErrorBoundaryProps) {
    const { toast } = useToast();
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [autoReported, setAutoReported] = useState(false);

    useEffect(() => {
        console.error('Felisha Error Boundary Caught:', error);

        // Auto-report critical errors to Linus (fire-and-forget)
        // This ensures Linus is notified even if user doesn't click "Report"
        const autoReportError = async () => {
            if (autoReported) return; // Prevent double-reporting

            try {
                const res = await fetch('/api/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: `[Auto] ${error.message || 'System Error'}`,
                        description: 'Automatically captured by Error Boundary - Linus notified',
                        priority: 'high',
                        category: 'system_error',
                        pageUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
                        reporterEmail: 'auto-boundary',
                        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
                        errorDigest: error.digest,
                        errorStack: error.stack
                    })
                });
                if (res.ok) {
                    setAutoReported(true);
                    console.log('[FelishaErrorBoundary] Auto-reported to Linus');
                }
            } catch (e) {
                console.warn('[FelishaErrorBoundary] Auto-report failed (non-critical):', e);
            }
        };

        // Auto-report in production, skip in dev to avoid spam
        if (process.env.NODE_ENV === 'production') {
            autoReportError();
        }
    }, [error, autoReported]);

    const handleCopyDetails = () => {
        const details = `Error: ${error.message}\nDigest: ${error.digest || 'N/A'}\nLocation: ${window.location.href}\nUser Agent: ${navigator.userAgent}`;
        navigator.clipboard.writeText(details);
        toast({
            title: "Copied to clipboard",
            description: "Error details ready to share.",
        });
    };

    const handleReport = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: error.message || 'System Error',
                    description: description || 'No description provided',
                    priority: 'high', // Default for intercepted errors
                    category: 'system_error',
                    screenshotUrl: '', // Could capture if we had html2canvas
                    pageUrl: window.location.href,
                    reporterEmail: 'auto-captured',
                    userAgent: navigator.userAgent,
                    errorDigest: error.digest,
                    errorStack: error.stack
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast({
                    title: "Report Submitted",
                    description: `Felisha has created a ticket. ID: ${data.id}`,
                });
                setDescription('');
            } else {
                throw new Error('Failed to submit ticket');
            }
        } catch (err) {
            console.error('Failed to submit error report:', err);
            toast({
                title: "Submission Failed",
                description: "Could not save ticket to database.",
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-[80vh] w-full items-center justify-center p-4">
            <Card className="max-w-md w-full border-red-200 bg-red-50/50">
                <CardHeader>
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                        <Bug className="h-6 w-6" />
                        <span className="font-semibold tracking-tight">System Error</span>
                    </div>
                    <CardTitle className="text-lg">Something went wrong</CardTitle>
                    <CardDescription>
                        A critical error occurred. Linus (AI CTO) has been automatically notified and is investigating.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md bg-white p-3 text-sm font-mono text-red-800 border overflow-x-auto">
                        {error.message || 'Unknown error occurred'}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Help us fix it (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="What were you doing when this happened?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button variant="ghost" size="sm" onClick={handleCopyDetails}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Details
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => reset()}
                            className="flex-1 sm:flex-none border-red-200 hover:bg-red-100 hover:text-red-900"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" /> Retry
                        </Button>
                        <Button
                            onClick={handleReport}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isSubmitting ? 'Sending...' : <><Send className="mr-2 h-4 w-4" /> Report</>}
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
