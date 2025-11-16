
'use client';
export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from "react";
import { ReviewsTable } from "./components/reviews-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { Review, Product } from "@/firebase/converters";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collectionGroup, query, where, collection, orderBy } from 'firebase/firestore';
import { useFirebase } from "@/firebase/provider";
import { reviewConverter, productConverter } from "@/firebase/converters";

export default function ReviewsPage() {
  const { user, isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        const claims = idTokenResult.claims;
        if (claims.brandId) setCurrentBrandId(claims.brandId as string);
      });
    }
  }, [user]);

  const reviewsQuery = useMemo(() => {
    if (!firestore || !currentBrandId) return null;
    return query(collectionGroup(firestore, 'reviews').withConverter(reviewConverter), where('brandId', '==', currentBrandId), orderBy('createdAt', 'desc'));
  }, [firestore, currentBrandId]);
  
  const productsQuery = useMemo(() => {
    if (!firestore || !currentBrandId) return null;
    return query(collection(firestore, 'products').withConverter(productConverter), where('brandId', '==', currentBrandId));
  }, [firestore, currentBrandId]);

  const { data: reviews, isLoading: areReviewsLoading } = useCollection<Review>(reviewsQuery, { debugPath: `**/reviews?brandId=${currentBrandId}` });
  const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);

  const formattedReviews = useMemo(() => {
    if (!reviews || !products) return [];
    
    return reviews.map((review) => {
        const productName = products.find(p => p.id === review.productId)?.name ?? "Unknown Product";
        return {
            id: review.id,
            productName: productName,
            userEmail: "Anonymous",
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
