
'use client';

import { useMemo } from "react";
import { ReviewsTable } from "./components/reviews-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { Review } from "@/lib/types";
import { useMenuData } from "@/hooks/use-menu-data";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";

export default function ReviewsPage() {
  const { firestore } = useFirebase();
  const { isUserLoading } = useUser();
  const { products, isLoading: areProductsLoading } = useMenuData();
  
  const reviewsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'reviews'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: reviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsQuery);

  const formattedReviews = useMemo(() => {
    if (!reviews || !products) return [];
    
    return reviews.map((review) => {
        const productName = products.find(p => p.id === review.productId)?.name ?? "Unknown Product";
        return {
            id: review.id,
            productName: productName,
            userEmail: "Anonymous", // User data is not denormalized on reviews for this demo
            rating: review.rating,
            text: review.text,
            date: review.createdAt.toDate().toLocaleDateString(),
        };
    });
  }, [reviews, products]);


  const isLoading = areReviewsLoading || isUserLoading || areProductsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <div>
            <Skeleton className="h-9 w-1/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="rounded-md border bg-card">
            <div className="p-4">
                 <Skeleton className="h-10 w-64" />
            </div>
            <div className="border-t p-4 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Reviews</h1>
        <p className="text-muted-foreground">
          Here's what your customers are saying about your products.
        </p>
      </div>
      <ReviewsTable data={formattedReviews} />
    </div>
  );
}
