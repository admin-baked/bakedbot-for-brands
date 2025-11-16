

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cookies } from 'next/headers';


const ReviewSchema = z.object({
  productId: z.string().min(1, 'Please select a product.'),
  rating: z.coerce.number().min(1, 'Please provide a rating.').max(5),
  text: z.string().min(10, 'Review must be at least 10 characters long.'),
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
    
    // Server-side validation
    const validatedFields = ReviewSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        return {
            message: 'Invalid form data. Please check your inputs.',
            error: true,
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { productId, ...reviewData } = validatedFields.data;

    let decodedToken;
    try {
        const sessionCookie = cookies().get('__session')?.value;
        if (!sessionCookie) {
            throw new Error('User not authenticated.');
        }
        decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (authError) {
        console.error("Server Action Auth Error:", authError);
        return {
            message: 'Authentication failed. Please sign in again.',
            error: true,
        };
    }

    const userId = decodedToken.uid;
    
    try {
        const productRef = firestore.collection('products').doc(productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) {
            return {
                message: 'This product does not exist. Cannot submit review.',
                error: true,
            };
        }
        
        const brandId = productSnap.data()?.brandId || 'unknown';
        const reviewCollectionRef = productRef.collection('reviews');
        
        const dataToSave = {
            ...reviewData,
            userId, 
            productId,
            brandId, // Add brandId to the review
            createdAt: FieldValue.serverTimestamp(),
        };

        await reviewCollectionRef.add(dataToSave);

        revalidatePath(`/products/${productId}`);
        revalidatePath('/dashboard/reviews');
        revalidatePath('/account/dashboard');

        return {
            message: 'Thank you! Your review has been submitted successfully.',
            error: false,
        };

    } catch (serverError: any) {
        console.error("Server Action Error (submitReview):", serverError);
        return {
            message: 'Submission failed: An unexpected server error occurred.',
            error: true,
        };
    }
}
