
'use client';

import { useState, useEffect } from "react";
import { ReviewsTable } from "./components/reviews-table";
import { useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/firebase/firestore/use-products";
import { useReviews } from "@/firebase/firestore/use-reviews";
import type { ReviewData } from "./components/reviews-table";


export default function ReviewsPage() {
  const { user, isUserLoading } = useUser();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const { data: products, isLoading: areProductsLoading } = useProducts();
  const { data: reviewsData, isLoading: areReviewsLoading } = useReviews();

  useEffect(() => {
    if (areReviewsLoading || areProductsLoading || !reviewsData || !products) {
      setReviews([]);
      return;
    }

    const formattedReviews = reviewsData.map((review) => {
      const productName = products.find(p => p.id === review.productId)?.name ?? "Unknown Product";
      return {
        id: review.id,
        productName: productName,
        userEmail: "Anonymous", // The logic to fetch user email was complex and permission-dependent, simplifying for now.
        rating: review.rating,
        text: review.text,
        date: review.createdAt.toDate().toLocaleDateString(),
      };
    });

    setReviews(formattedReviews);

  }, [reviewsData, products, areReviewsLoading, areProductsLoading]);


  if (areReviewsLoading || areProductsLoading || isUserLoading) {
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
      <ReviewsTable data={reviews} />
    </div>
  );
}
