
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { getFirestore, collection } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


// Define the schema for review form validation
const ReviewSchema = z.object({
  userId: z.string().min(1, 'User ID is missing.'),
  productId: z.string().min(1, 'Please select a product.'),
  rating: z.coerce.number().min(1, 'Please provide a rating.').max(5),
  text: z.string().min(10, 'Review must be at least 10 characters long.'),
  // For now, we'll make the image optional on the server-side
  // as we are not handling file uploads yet.
  verificationImage: z.any().optional(),
});


export async function submitReview(prevState: any, formData: FormData) {
  
  const validatedFields = ReviewSchema.safeParse({
    userId: formData.get('userId'),
    productId: formData.get('productId'),
    rating: formData.get('rating'),
    text: formData.get('text'),
    verificationImage: formData.get('verificationImage'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data. Please check your inputs.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { productId, userId, ...reviewData } = validatedFields.data;

  // TODO: Handle the actual image upload to Firebase Storage
  // For now, we'll store a placeholder or a marker that it exists.
  const verificationImageUrl = validatedFields.data.verificationImage.size > 0 
      ? 'placeholder/verification_image.jpg' 
      : '';
  
  const dataToSave = {
      productId: productId,
      ...reviewData,
      userId: userId, // Use the UID passed from the client
      verificationImageUrl,
      createdAt: new Date(), // Use client-side date for non-blocking
  };

  try {
    const { firestore } = initializeFirebase();
    const reviewCollectionRef = collection(firestore, `products/${productId}/reviews`);
    
    // Use the non-blocking utility
    addDocumentNonBlocking(reviewCollectionRef, dataToSave);
    
    revalidatePath('/products'); // Revalidate product pages if they show reviews
    revalidatePath('/dashboard/reviews'); // also revalidate the reviews dashboard

    return {
      message: 'Thank you! Your review has been submitted successfully.',
      error: false,
    };

  } catch (serverError: any) {
    console.error("Server Action Error (submitReview):", serverError);
    
    return {
      message: `Submission failed: An unexpected server error occurred.`,
      error: true,
    }
  }
}
