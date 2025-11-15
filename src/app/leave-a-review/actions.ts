

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const ReviewSchema = z.object({
  productId: z.string().min(1, 'Please select a product.'),
  rating: z.coerce.number().min(1, 'Please provide a rating.').max(5),
  text: z.string().min(10, 'Review must be at least 10 characters long.'),
  // The ID token is now a required part of the schema for validation
  idToken: z.string().min(1, 'Authentication token is missing.'),
});

export type ReviewFormState = {
    message: string;
    error: boolean;
    fieldErrors?: { [key: string]: string[] | undefined };
};

export async function submitReview(
    prevState: ReviewFormState,
    formData: FormData
): Promise<ReviewFormState> {
    const { auth: adminAuth, firestore } = await createServerClient();
    
    const validatedFields = ReviewSchema.safeParse({
        productId: formData.get('productId'),
        rating: formData.get('rating'),
        text: formData.get('text'),
        idToken: formData.get('idToken'), // Get the token from the form
    });

    if (!validatedFields.success) {
        return {
            message: 'Invalid form data. Please check your inputs.',
            error: true,
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    // Destructure after successful validation
    const { productId, idToken, ...reviewData } = validatedFields.data;
    
    let decodedToken;
    try {
        // Securely verify the ID token on the server
        decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (authError) {
        console.error("Server Action Auth Error:", authError);
        return {
            message: 'Authentication failed. Please sign in again.',
            error: true,
        };
    }

    const userId = decodedToken.uid; // Use the UID from the verified token
    const reviewCollectionRef = firestore.collection(`products/${productId}/reviews`);
    
    const dataToSave = {
        ...reviewData,
        userId, // Use the secure, server-verified user ID
        productId, // Add the product ID for collection group queries
        createdAt: FieldValue.serverTimestamp(),
    };

    try {
        // This is a server-side admin write. It bypasses security rules.
        // We do not use the client-side converter here.
        await reviewCollectionRef.add(dataToSave);

        revalidatePath(`/products/${productId}`);
        revalidatePath('/dashboard/reviews');
        revalidatePath('/account/dashboard');

        return {
            message: 'Thank you! Your review has been submitted successfully.',
            error: false,
        };

    } catch (serverError: any) {
        // This is a placeholder for a more robust error handling system
        // that would ideally create and emit a contextual error.
        console.error("Server Action Error (submitReview):", serverError);
        return {
            message: 'Submission failed: An unexpected server error occurred.',
            error: true,
        };
    }
}
