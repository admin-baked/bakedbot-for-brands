
'use client';

import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, getDoc, Firestore } from "firebase/firestore";
import { ReviewsTable } from "./components/reviews-table";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useFirebase, useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/firebase/firestore/use-products";
import type { Product } from '@/lib/types';
import type { Review } from '@/lib/types';

// Define the shape of the data we'll pass to the table
export type ReviewData = {
  id: string;
  productName: string;
  userEmail: string;
  rating: number;
  text: string;
  date: string;
};

async function getReviews(firestore: Firestore, products: Product[] | null): Promise<ReviewData[]> {
  const reviewsQuery = query(collection(firestore, "reviews"));
  const querySnapshot = await getDocs(reviewsQuery).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: 'reviews',
      operation: 'list',
    });
    errorEmitter.emit('permission-error', permissionError);
    return { docs: [] } as unknown as typeof querySnapshot;
  });

  if (!querySnapshot || !products) return [];

  const reviewsPromises = querySnapshot.docs.map(async (reviewDoc) => {
    const review = reviewDoc.data() as Review;
    const productName = products.find(p => p.id === review.productId)?.name ?? "Unknown Product";
    let userEmail = "Anonymous";

    if (review.userId) {
      const userDocRef = doc(firestore, 'users', review.userId);
      try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            userEmail = userDoc.data()?.email ?? "Anonymous";
        }
      } catch (e) {
         const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    }

    return {
      id: reviewDoc.id,
      productName: productName,
      userEmail: userEmail,
      rating: review.rating,
      text: review.text,
      date: review.createdAt.toDate().toLocaleDateString(),
    };
  });

  const reviews = await Promise.all(reviewsPromises);

  return reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function ReviewsPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const { data: products, isLoading: areProductsLoading } = useProducts();

  useEffect(() => {
    if (!isUserLoading && user && firestore && !areProductsLoading) {
      setIsFetchingData(true);
      getReviews(firestore, products).then(data => {
        setReviews(data);
        setIsFetchingData(false);
      }).catch(err => {
        console.error("Failed to fetch reviews:", err);
        setIsFetchingData(false);
      });
    } else if (!isUserLoading && !user) {
        setIsFetchingData(false);
    }
  }, [firestore, user, isUserLoading, products, areProductsLoading]);


  if (isFetchingData || areProductsLoading) {
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
