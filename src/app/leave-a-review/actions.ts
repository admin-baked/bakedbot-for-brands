
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

// Define the schema for review form validation
const ReviewSchema = z.object({
  productId: z.string().min(1, 'Please select a product.'),
  userId: z.string(),
  rating: z.coerce.number().min(1, 'Please provide a rating.').max(5),
  text: z.string().min(10, 'Review must be at least 10 characters long.'),
  // For now, we'll make the image optional on the server-side
  // as we are not handling file uploads yet.
  verificationImage: z.any().optional(),
});


export async function submitReview(prevState: any, formData: FormData) {
  const validatedFields = ReviewSchema.safeParse({
    productId: formData.get('productId'),
    userId: formData.get('userId'),
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
  
  // We need to establish the server client here to handle both success and error paths.
  const { firestore } = await createServerClient();
  const { productId, ...reviewData } = validatedFields.data;

  // TODO: Handle the actual image upload to Firebase Storage
  // For now, we'll store a placeholder or a marker that it exists.
  const verificationImageUrl = validatedFields.data.verificationImage.size > 0 
      ? 'placeholder/verification_image.jpg' 
      : '';
  
  const reviewCollectionRef = collection(firestore, 'products', productId, 'reviews');
  
  const dataToSave = {
      ...reviewData,
      verificationImageUrl,
      createdAt: serverTimestamp(),
  };

  try {
    // Use non-blocking addDoc and chain a .catch for error handling
    await addDoc(reviewCollectionRef, dataToSave);

    revalidatePath('/products'); // Revalidate product pages if they show reviews
    revalidatePath('/dashboard/reviews'); // also revalidate the reviews dashboard

    return {
      message: 'Thank you! Your review has been submitted successfully.',
      error: false,
    };

  } catch (serverError: any) {
    const permissionError = new FirestorePermissionError({
        path: reviewCollectionRef.path,
        operation: 'create',
        requestResourceData: { ...dataToSave, createdAt: 'SERVER_TIMESTAMP' } // Use string placeholder for server value
    } satisfies SecurityRuleContext);
    
    // Server actions can't emit client events. Instead, we return a structured
    // error that the client form can display.
    return {
      message: `Submission failed: A permission error occurred. Please check your security rules.`,
      error: true,
    }
  }
}
