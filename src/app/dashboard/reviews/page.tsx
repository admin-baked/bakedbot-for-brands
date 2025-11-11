
'use client';

import { useState, useEffect } from "react";
import { ReviewsTable } from "./components/reviews-table";
import { useUser } from "@/firebase/auth/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewData } from "./components/reviews-table";
import { useFirebase } from "@/firebase/provider";
import { collection, collectionGroup, onSnapshot, query, orderBy } from "firebase/firestore";
import type { Product, Review } from "@/lib/types";
import { useMenuData } from "@/hooks/use-menu-data";


export default function ReviewsPage() {
  const { isUserLoading } = useUser();
  const { firestore } = useFirebase();
  const { products, isLoading: areProductsLoading } = useMenuData();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || areProductsLoading) return;
    setIsLoading(true);
    
    const reviewsQuery = query(collectionGroup(firestore, 'reviews'), orderBy("createdAt", "desc"));
    const reviewsUnsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
        const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));

        const formattedReviews = reviewsData.map((review) => {
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

        setReviews(formattedReviews);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching reviews:", error);
        setIsLoading(false);
    });

    return () => {
        reviewsUnsubscribe();
    }

  }, [firestore, products, areProductsLoading]);


  if (isLoading || isUserLoading || areProductsLoading) {
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
