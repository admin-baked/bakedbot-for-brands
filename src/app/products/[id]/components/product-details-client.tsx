
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReviewSummary from './review-summary';
import type { Product } from '@/lib/types';

export default function ProductDetailsClient({ product }: { product: Product }) {
    const { addToCart } = useCart();
    
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
                    <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
                </div>
                
                <div className="prose text-muted-foreground">
                    <p>{product.description}</p>
                </div>

                <Button size="lg" className="w-full" onClick={() => addToCart({ ...product, quantity: 1 })}>
                    <Plus className="mr-2 h-5 w-5" />
                    Add to Cart
                </Button>

                <ReviewSummary productId={product.id} productName={product.name} />
            </div>
        </div>
    );
}
