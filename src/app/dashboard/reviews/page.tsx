
import { createServerClient } from "@/firebase/server-client";
import { collectionGroup, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
import { products } from "@/lib/data";
import { ReviewsTable } from "./components/reviews-table";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

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

async function getReviews(): Promise<ReviewData[]> {
  const { firestore } = await createServerClient();

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

    const userDocRef = doc(firestore, 'users', review.userId);
    const userDoc = await getDoc(userDocRef).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        // Return null to handle the failure gracefully
        return null;
    });
    
    if (userDoc && userDoc.exists()) {
        userEmail = userDoc.data()?.email ?? "Anonymous";
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

export default async function ReviewsPage() {
  const reviews = await getReviews();

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
