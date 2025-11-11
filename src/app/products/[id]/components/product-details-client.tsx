
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';
import { useMemo, useActionState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { useStore } from '@/hooks/use-store';
import { updateProductFeedback } from '../actions';
import { useUser } from '@/firebase/auth/use-user';


function ReviewSummaryDisplay({ summary, isLoading }: { summary: SummarizeReviewsOutput | null, isLoading: boolean }) {
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
                ) : !summary ? (
                     <div className="flex flex-col items-center justify-center space-y-2 text-destructive h-32">
                        <XCircle className="h-8 w-8" />
                        <p>Could not load summary.</p>
                    </div>
                ) : (
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

const initialFeedbackState = { message: '', error: false };

export default function ProductDetailsClient({ product, summary }: { product: Product, summary: SummarizeReviewsOutput | null }) {
    const { addToCart } = useCart();
    const { selectedLocationId } = useStore();
    const { toast } = useToast();
    const { user } = useUser();
    
    const [feedbackState, submitFeedback, isFeedbackPending] = useActionState(updateProductFeedback, initialFeedbackState);

    useEffect(() => {
        if (feedbackState.message) {
            toast({
                title: feedbackState.error ? 'Error' : 'Feedback Submitted!',
                description: feedbackState.message,
                variant: feedbackState.error ? 'destructive' : 'default',
            });
        }
    }, [feedbackState, toast]);
    
    const priceDisplay = useMemo(() => {
        const hasPricing = product.prices && Object.keys(product.prices).length > 0;
        
        if (selectedLocationId && hasPricing && product.prices[selectedLocationId]) {
            return `$${product.prices[selectedLocationId].toFixed(2)}`;
        }
        
        if (!selectedLocationId && hasPricing) {
            const priceValues = Object.values(product.prices);
            if (priceValues.length > 0) {
                const minPrice = Math.min(...priceValues);
                const maxPrice = Math.max(...priceValues);

                if (minPrice === maxPrice) {
                    return `$${minPrice.toFixed(2)}`;
                }
                return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
            }
        }
        
        return `$${product.price.toFixed(2)}`;
    }, [product, selectedLocationId]);

    const handleFeedback = (feedbackType: 'like' | 'dislike') => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Authentication Required',
                description: 'You must be logged in to leave feedback.',
            });
            return;
        }
        const formData = new FormData();
        formData.append('productId', product.id);
        formData.append('feedbackType', feedbackType);
        submitFeedback(formData);
    };

    const handleAddToCart = () => {
        if (!selectedLocationId) {
            const locator = document.getElementById('locator');
            if (locator) {
                locator.scrollIntoView({ behavior: 'smooth' });
                locator.classList.add('animate-pulse', 'ring-2', 'ring-primary', 'rounded-lg');
                setTimeout(() => {
                    locator.classList.remove('animate-pulse', 'ring-2', 'ring-primary', 'rounded-lg');
                }, 2000);
            }
            toast({
                variant: 'destructive',
                title: 'No Location Selected',
                description: 'Please select a dispensary location before adding items to your cart.',
            });
            return;
        }
        addToCart(product, selectedLocationId);
        toast({
            title: 'Added to Cart!',
            description: `${product.name} has been added to your cart.`
        });
    };

    return (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto py-8 px-4">
            <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    data-ai-hint={product.imageHint}
                />
            </div>

            <div className="space-y-6">
                <Button variant="outline" size="sm" asChild className="w-fit">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Menu
                    </Link>
                </Button>
                
                <div className="space-y-3">
                    <Badge variant="secondary">{product.category}</Badge>
                    <h1 className="text-4xl font-bold font-teko tracking-wider uppercase">{product.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                            <span>{product.likes ?? 0} Likes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                            <span>{product.dislikes ?? 0} Dislikes</span>
                        </div>
                    </div>
                    <p className="text-3xl font-bold">{priceDisplay}</p>
                </div>
                
                <div className="prose text-muted-foreground">
                    <p>{product.description}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button size="lg" className="w-full" onClick={handleAddToCart}>
                        <Plus className="mr-2 h-5 w-5" />
                        Add to Cart
                    </Button>
                    <Button variant="outline" size="lg" aria-label="Like" onClick={() => handleFeedback('like')} disabled={isFeedbackPending || !user}>
                        <ThumbsUp className="h-5 w-5 text-green-500"/>
                    </Button>
                    <Button variant="outline" size="lg" aria-label="Dislike" onClick={() => handleFeedback('dislike')} disabled={isFeedbackPending || !user}>
                        <ThumbsDown className="h-5 w-5 text-red-500"/>
                    </Button>
                </div>
                {!selectedLocationId && (
                    <p className="text-sm text-center text-destructive">Please select a location to add items to your cart.</p>
                )}

                <ReviewSummaryDisplay summary={summary} isLoading={!summary} />
            </div>
        </div>
    );
}
