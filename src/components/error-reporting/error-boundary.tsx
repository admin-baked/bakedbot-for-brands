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

    useEffect(() => {
        console.error('Felisha Error Boundary Caught:', error);
    }, [error]);

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
        // Simulate reporting delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real implementation, this would POST to /api/tickets/create
        toast({
            title: "Report Submitted",
            description: "Felisha has created a ticket for this issue. ID: TKT-" + Math.floor(Math.random() * 10000),
        });
        setIsSubmitting(false);
        setDescription('');
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
                        A critical error occurred. Felisha has logged this event.
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
