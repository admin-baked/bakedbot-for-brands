'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { summarizeReviews } from '@/ai/flows/summarize-reviews';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { Loader2, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function ReviewSummary({ productId, productName }: { productId: string, productName: string }) {
    const [summary, setSummary] = useState<SummarizeReviewsOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            if (!productId || !productName) return;
            
            setIsLoading(true);
            setError(null);

            try {
                 const result = await summarizeReviews({ productId, productName });
                 if(result) {
                    setSummary(result);
                 } else {
                    throw new Error("Failed to get a summary from the server.");
                 }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(errorMessage);
                console.error("Failed to summarize reviews:", errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, [productId, productName]);

    return (
        <Card className="bg-muted/30">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <MessageSquare className='h-5 w-5 text-primary' />
                    <CardTitle className="text-xl">AI Review Summary</CardTitle>
                </div>
                <CardDescription>A quick overview of what customers are saying.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p>Generating summary...</p>
                    </div>
                ) : error ? (
                     <div className="flex flex-col items-center justify-center space-y-2 text-destructive h-32">
                        <XCircle className="h-8 w-8" />
                        <p>Could not load summary.</p>
                    </div>
                ) : summary && (
                    <div className='space-y-4'>
                        <div className='flex items-center gap-2'>
                            <Badge variant="secondary">{summary.reviewCount} reviews analyzed</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground italic">"{summary.summary}"</p>

                        <Separator />
                        
                        <div className='grid grid-cols-1 @sm:grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                                 <h4 className='font-semibold flex items-center gap-2'><CheckCircle className='h-5 w-5 text-green-500'/> Pros</h4>
                                 <ul className='list-disc pl-5 space-y-1 text-sm'>
                                    {summary.pros.length > 0 ? summary.pros.map((pro, i) => <li key={i}>{pro}</li>) : <li>No common pros found.</li>}
                                 </ul>
                            </div>
                            <div className='space-y-2'>
                                <h4 className='font-semibold flex items-center gap-2'><XCircle className='h-5 w-5 text-red-500'/> Cons</h4>
                                 <ul className='list-disc pl-5 space-y-1 text-sm'>
                                    {summary.cons.length > 0 ? summary.cons.map((con, i) => <li key={i}>{con}</li>) : <li>No common cons found.</li>}
                                 </ul>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
