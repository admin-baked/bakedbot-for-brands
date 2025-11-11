'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import type { Review } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface CustomerReviewHistoryProps {
  reviews: Review[] | null;
  isLoading: boolean;
}

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

export default function CustomerReviewHistory({ reviews, isLoading }: CustomerReviewHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Star /> Your Reviews</CardTitle>
        <CardDescription>A look at your recent contributions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">You haven't left any reviews yet.</p>
            <Link href="/leave-a-review" className="text-sm text-primary hover:underline">Leave your first review</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 3).map(review => (
              <div key={review.id} className="flex items-start gap-3">
                 <div className="flex-1">
                    <div className="flex items-center justify-between">
                         <Link href={`/products/${review.productId}`} className="font-medium hover:underline text-sm">
                            Review for Product
                        </Link>
                        <StarRating rating={review.rating} />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">"{review.text}"</p>
                 </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
