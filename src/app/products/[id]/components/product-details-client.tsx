

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { useStore } from '@/hooks/use-store';


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


export default function ProductDetailsClient({ product, summary }: { product: Product, summary: SummarizeReviewsOutput | null }) {
    const { addToCart } = useCart();
    const { selectedLocationId } = useStore();
    
    const priceDisplay = useMemo(() => {
        const priceValues = Object.values(product.prices || {});

        if (selectedLocationId && product.prices?.[selectedLocationId]) {
            return `$${product.prices[selectedLocationId].toFixed(2)}`;
        }

        if (priceValues.length === 0) {
            return `$${product.price.toFixed(2)}`;
        }

        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);

        if (minPrice === maxPrice) {
            return `$${minPrice.toFixed(2)}`;
        }

        return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
    }, [product, selectedLocationId]);

    return (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto py-8 px-4">
            <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
                <Image
                    src={product.imageUrl}
                    alt={product.name}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint={product.imageHint}
                />
            </div>

            <div className="space-y-6">
                <Button variant="outline" size="sm" asChild className="w-fit">
                    <Link href="/menu">
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
                            <span>{product.likes} Likes</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                            <span>{product.dislikes} Dislikes</span>
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{priceDisplay}</p>
                </div>
                
                <div className="prose text-muted-foreground">
                    <p>{product.description}</p>
                </div>

                <Button size="lg" className="w-full" onClick={() => addToCart(product, selectedLocationId)}>
                    <Plus className="mr-2 h-5 w-5" />
                    Add to Cart
                </Button>

                <ReviewSummaryDisplay summary={summary} isLoading={!summary} />
            </div>
        </div>
    );
}
