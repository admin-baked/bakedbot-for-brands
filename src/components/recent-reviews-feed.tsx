'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Star, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Review, Product } from '@/types/domain';
import { Skeleton } from './ui/skeleton';

// Helper function to safely convert various date formats to a Date object
function getCreatedAtDate(createdAt: any): Date | null {
  if (!createdAt) return null;

  // Firestore Timestamp (client/admin)
  if (typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }

  // Already a Date
  if (createdAt instanceof Date) {
    return createdAt;
  }

  // ISO string or something date-like
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}


const ReviewCard = ({ review, product }: { review: Review, product?: Product }) => {
    const createdAtDate = getCreatedAtDate(review.createdAt);
    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-start gap-4">
                {product && (
                    <Link href={`/menu/${product.brandId || 'default'}/products/${product.id}`} className="shrink-0">
                        <div className="relative h-16 w-16 rounded-md overflow-hidden border">
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                        </div>
                    </Link>
                )}
                <div>
                    <CardTitle className="text-base line-clamp-1">{product?.name || `Review for product ${review.productId}`}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 italic">"{review.text}"</p>
                <p className="text-xs text-muted-foreground/80 mt-3 text-right">
                    {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'Just now'}
                </p>
            </CardContent>
        </Card>
    )
};

const ReviewSkeleton = () => (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
)

interface RecentReviewsFeedProps {
    reviews?: Review[];
    products?: Product[];
    isLoading?: boolean;
}

export default function RecentReviewsFeed({ reviews = [], products = [], isLoading = false }: RecentReviewsFeedProps) {

    if (isLoading) {
        return (
             <div className="py-12">
                <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">What People Are Saying</h2>
                <Carousel opts={{ align: "start" }} className="w-full">
                    <CarouselContent className="-ml-4">
                        {[...Array(5)].map((_, i) => (
                            <CarouselItem key={i} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                                <ReviewSkeleton />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                     <CarouselPrevious className="hidden lg:flex" />
                     <CarouselNext className="hidden lg:flex" />
                </Carousel>
             </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return (
             <div className="text-center py-20 my-8 bg-muted/40 rounded-lg">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Recent Reviews</h3>
                <p className="mt-2 text-sm text-muted-foreground">Be the first to leave a review on one of our products!</p>
            </div>
        );
    }
    
    return (
        <div className="py-12">
            <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">What People Are Saying</h2>
            <Carousel opts={{ align: "start" }} className="w-full">
                <CarouselContent className="-ml-4">
                    {reviews.map(review => {
                        const product = products.find(p => p.id === review.productId);
                        return (
                            <CarouselItem key={review.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                                <ReviewCard review={review} product={product} />
                            </CarouselItem>
                        )
                    })}
                </CarouselContent>
                <CarouselPrevious className="hidden lg:flex" />
                <CarouselNext className="hidden lg:flex" />
            </Carousel>
        </div>
    )
}
