
import { createServerClient } from "@/firebase/server-client";
import { collectionGroup, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
import { products } from "@/lib/data";
import { ReviewsTable } from "./components/reviews-table";

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

  // Use a collectionGroup query to get all reviews from all products
  const reviewsQuery = collectionGroup(firestore, "reviews");
  const querySnapshot = await getDocs(reviewsQuery);

  const reviews: ReviewData[] = [];

  for (const reviewDoc of querySnapshot.docs) {
    const review = reviewDoc.data() as ReviewDoc;
    
    // Find product name from our local data for simplicity
    const productName = products.find(p => p.id === review.productId)?.name ?? "Unknown Product";
    
    // Fetch the user's email from the users collection
    let userEmail = "Anonymous";
    try {
        const userDocRef = doc(firestore, 'users', review.userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            userEmail = userDoc.data()?.email ?? "Anonymous";
        }
    } catch (error) {
        console.error(`Failed to fetch user ${review.userId}`, error);
    }
    
    reviews.push({
      id: reviewDoc.id,
      productName: productName,
      userEmail: userEmail,
      rating: review.rating,
      text: review.text,
      date: review.createdAt.toDate().toLocaleDateString(),
    });
  }

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
