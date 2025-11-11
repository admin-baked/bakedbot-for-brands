'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare } from 'lucide-react';
import { useUser } from '@/firebase/auth/use-user';
import type { Review, Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentReviewsProps {
  reviews: Review[];
  products: Product[];
  isLoading: boolean;
}

const ReviewItemSkeleton = () => (
    <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    </div>
);


export default function RecentReviews({ reviews, products, isLoading }: RecentReviewsProps) {
  const { user } = useUser();

  const userReviews = useMemo(() => {
    if (!user || !reviews) return [];
    
    // Find the product name for each review
    return reviews
      .filter(review => review.userId === user.uid)
      .map(review => {
          const product = products.find(p => p.id === review.productId);
          return {
              ...review,
              productName: product?.name || 'Unknown Product',
          };
      })
      .slice(0, 3); // Show the 3 most recent reviews
  }, [user, reviews, products]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Recent Reviews</CardTitle>
        <CardDescription>A look at your recent contributions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
            <div className="space-y-4">
                <ReviewItemSkeleton />
                <ReviewItemSkeleton />
                <ReviewItemSkeleton />
            </div>
        ) : userReviews.length > 0 ? (
          userReviews.map(review => (
            <div key={review.id} className="flex items-start gap-4">
               <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Star className="h-5 w-5 text-primary" />
               </div>
               <div className="flex-1">
                    <p className="text-sm font-medium leading-none">
                        Review for <Link href={`/products/${review.productId}`} className="text-primary hover:underline">{review.productName}</Link>
                    </p>
                    <p className="text-sm text-muted-foreground truncate">"{review.text}"</p>
               </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-6">
            <MessageSquare className="h-8 w-8" />
            <p className="mt-2 text-sm">You haven't left any reviews yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
