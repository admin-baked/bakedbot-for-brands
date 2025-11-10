
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const { firestore } = await createServerClient();
  
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
  
  const reviewCollectionRef = collection(firestore, 'products', productId, 'reviews');
  
  const dataToSave = {
      productId: productId,
      ...reviewData,
      userId: userId, // Use the UID passed from the client
      verificationImageUrl,
      createdAt: serverTimestamp(),
  };

  try {
    // The Admin SDK has permission to write here.
    await addDoc(reviewCollectionRef, dataToSave);

    revalidatePath('/products'); // Revalidate product pages if they show reviews
    revalidatePath('/dashboard/reviews'); // also revalidate the reviews dashboard

    return {
      message: 'Thank you! Your review has been submitted successfully.',
      error: false,
    };

  } catch (serverError: any) {
    // This will likely not be a permission error with Admin SDK, but rather a server/network issue.
    // However, if rules were ever applied to the Admin SDK (not default), this would be relevant.
    const permissionError = new FirestorePermissionError({
        path: reviewCollectionRef.path,
        operation: 'create',
        requestResourceData: { ...dataToSave, createdAt: 'SERVER_TIMESTAMP' }
    });
    
    console.error("Server Action Error (submitReview):", permissionError.message);
    
    return {
      message: `Submission failed: An unexpected server error occurred.`,
      error: true,
    }
  }
}
