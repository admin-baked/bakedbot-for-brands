
'use client';

import { useState, useEffect } from "react";
import { collectionGroup, getDocs, Timestamp, doc, getDoc, Firestore } from "firebase/firestore";
import { products } from "@/lib/data";
import { ReviewsTable } from "./components/reviews-table";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useFirebase, useUser } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";

// Define the shape of a review document from Firestore
type ReviewDoc = {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  text: string;
  verificationImageUrl: string;
  createdAt: Timestamp;
};

// Define the shape of the data we'll pass to the table
export type ReviewData = {
  id: string;
  productName: string;
  userEmail: string; // We'll fetch this separately
  rating: number;
  text: string;
  date: string;
};

async function getReviews(firestore: Firestore): Promise<ReviewData[]> {
  const reviewsQuery = collectionGroup(firestore, "reviews");
  const querySnapshot = await getDocs(reviewsQuery).catch(serverError => {
    const permissionError = new FirestorePermissionError({
      path: 'reviews', // Path for a collection group query
      operation: 'list',
    });
    errorEmitter.emit('permission-error', permissionError);
    // Return an empty snapshot to prevent further errors down the chain
    return { docs: [] } as unknown as typeof querySnapshot;
  });

  if (!querySnapshot) return [];

  const reviewsPromises = querySnapshot.docs.map(async (reviewDoc) => {
    const review = reviewDoc.data() as ReviewDoc;
    const productName = products.find(p => p.id === review.productId)?.name ?? "Unknown Product";
    let userEmail = "Anonymous";

    // Only attempt to fetch user if userId is present
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
        // Fail gracefully, user email will remain "Anonymous"
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

  // Sort reviews by most recent first
  return reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default function ReviewsPage() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  useEffect(() => {
    // This effect now strictly waits for the user to be loaded AND present.
    if (!isUserLoading && user && firestore) {
      setIsFetchingData(true);
      getReviews(firestore).then(data => {
        setReviews(data);
        setIsFetchingData(false);
      }).catch(err => {
        // This catch is for unexpected errors in the getReviews function itself
        console.error("Failed to fetch reviews:", err);
        setIsFetchingData(false);
      });
    } else if (!isUserLoading && !user) {
        // If the user is definitively logged out, we stop loading.
        setIsFetchingData(false);
    }
  }, [firestore, user, isUserLoading]);


  if (isUserLoading || isFetchingData) {
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
          Here&apos;s what your customers are saying about your products.
        </p>
      </div>
      <ReviewsTable data={reviews} />
    </div>
  );
}
