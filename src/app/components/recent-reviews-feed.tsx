
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, MessageSquare } from 'lucide-react';
import type { Review } from '@/firebase/converters';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMenuData } from '@/hooks/use-menu-data';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { collectionGroup, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { reviewConverter } from '@/firebase/converters';
import { useDemoMode } from '@/context/demo-mode';
import { demoCustomer } from '@/lib/data';
import { useUser } from '@/firebase/auth/use-user';

const ReviewItemSkeleton = () => (
    <Card className="w-80 shrink-0">
        <CardHeader>
            <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
        </CardContent>
    </Card>
);

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

export default function RecentReviewsFeed() {
  const { isDemo } = useDemoMode();
  const { firestore } = useFirebase();
  const { user } = useUser();
  
  const reviewsQuery = useMemo(() => {
    // TEMPORARY FIX: Only run the query if the user is authenticated.
    if (isDemo || !firestore || !user) return null;
    const baseQuery = collectionGroup(firestore, 'reviews').withConverter(reviewConverter);
    return query(baseQuery, orderBy('createdAt', 'desc'), limit(10));
  }, [firestore, isDemo, user]);

  const { data: liveReviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsQuery);
  const { products, isLoading: areProductsLoading } = useMenuData();

  const isLoading = areReviewsLoading || areProductsLoading;

  const enrichedReviews = useMemo(() => {
    const sourceReviews = isDemo ? demoCustomer.reviews : liveReviews;
    if (!sourceReviews || !products) return [];
    
    // Sort demo reviews by date, as they are static
    if (isDemo) {
        sourceReviews.sort((a, b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());
    }

    return sourceReviews
      .map(review => {
          const product = products.find(p => p.id === review.productId);
          return {
              ...review,
              productName: product?.name || 'Unknown Product',
          };
      })
      .slice(0, 10); // Show the 10 most recent reviews
  }, [isDemo, liveReviews, products]);

  // Don't render the component at all for unauthenticated users in live mode
  if (!isDemo && !user) {
    return null;
  }

  return (
    <div className="py-12">
        <div className="container mx-auto text-center">
             <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4">
                Community Reviews
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                See what others are saying about our products to help you find your perfect match.
            </p>
        </div>

        <div className="relative -mx-4">
            <div className="flex gap-6 pb-4 px-4 overflow-x-auto">
                {isLoading && !isDemo ? (
                    [...Array(4)].map((_, i) => <ReviewItemSkeleton key={i} />)
                ) : enrichedReviews.length > 0 ? (
                enrichedReviews.map(review => (
                    <Card key={review.id} className="w-80 shrink-0">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback>{(review.userId || 'A').substring(0, 1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold">Review for <Link href={`/products/${review.productId}`} className="text-primary hover:underline">{review.productName}</Link></p>
                                    <StarRating rating={review.rating || 0} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground italic line-clamp-3">"{review.text}"</p>
                        </CardContent>
                    </Card>
                ))
                ) : (
                <div className="w-full text-center py-12 text-muted-foreground col-span-full">
                    <MessageSquare className="mx-auto h-12 w-12" />
                    <p className="mt-4">No reviews yet.</p>
                    <p className="text-sm">Be the first to leave a review!</p>
                </div>
                )}
            </div>
             <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
             <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        </div>
    </div>
  );
}
