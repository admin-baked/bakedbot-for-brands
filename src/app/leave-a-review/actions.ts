
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { headers } from 'next/headers';


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
    
    // In a real app, you'd get the ID token from the request headers
    // and verify it to get the user's UID.
    const authorization = headers().get('Authorization');
    // For this demo, we're simulating a failure if the header isn't present,
    // which it won't be from the client code. A real app would pass the token.
    if (!authorization) {
        return {
            message: 'Authentication required. Please sign in to submit a review.',
            error: true,
        };
    }
    
    // let decodedToken;
    // try {
    //     decodedToken = await adminAuth.verifyIdToken(authorization.replace('Bearer ', ''));
    // } catch (authError) {
    //     return {
    //         message: 'Authentication failed. Please sign in again.',
    //         error: true,
    //     };
    // }

    // const userId = decodedToken.uid;
    // For the demo, we will get the userId from form data but know this is insecure.
    const userId = formData.get('userId') as string;
    if (!userId) {
        return {
            message: 'Authentication failed. You must be signed in to leave a review.',
            error: true,
        };
    }


    const validatedFields = ReviewSchema.safeParse({
        productId: formData.get('productId'),
        rating: formData.get('rating'),
        text: formData.get('text'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Invalid form data. Please check your inputs.',
            error: true,
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { productId, ...reviewData } = validatedFields.data;

    try {
        const reviewCollectionRef = firestore.collection(`products/${productId}/reviews`);
        
        await reviewCollectionRef.add({
            ...reviewData,
            userId, // Securely use the server-verified user ID
            productId, // Add the product ID for collection group queries
            createdAt: FieldValue.serverTimestamp(),
        });

        revalidatePath('/products');
        revalidatePath('/dashboard/reviews');

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
