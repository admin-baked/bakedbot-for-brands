
'use server';

import {
  generateProductDescription,
  type GenerateProductDescriptionInput,
  type GenerateProductDescriptionOutput
} from '@/ai/flows/generate-product-description';
import {
  generateSocialMediaImage,
  type GenerateSocialMediaImageInput,
  type GenerateSocialMediaImageOutput
} from '@/ai/flows/generate-social-image';
import {
  summarizeReviews,
  type SummarizeReviewsInput,
  type SummarizeReviewsOutput,
} from '@/ai/flows/summarize-reviews';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { increment } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const FormSchema = z.object({
  productName: z.string().min(3, 'Product name must be at least 3 characters.'),
  features: z.string().min(3, 'Features must be at least 3 characters.'),
  keywords: z.string().min(3, 'Keywords must be at least 3 characters.'),
  brandVoice: z.string().min(1, 'Please select a brand voice.'),
  msrp: z.string().optional(),
  imageUrl: z.string().optional(), // Now we expect the image URL (as a data URI)
});

export type DescriptionFormState = {
  message: string;
  data: GenerateProductDescriptionOutput | null;
  error: boolean;
  fieldErrors?: {
    [key: string]: string[] | undefined;
  };
};

export type ImageFormState = {
  message: string;
  imageUrl: string | null;
  error: boolean;
};

export type ReviewSummaryFormState = {
  message: string;
  data: SummarizeReviewsOutput | null;
  error: boolean;
};

export async function createProductDescription(
  prevState: DescriptionFormState,
  formData: FormData
): Promise<DescriptionFormState> {
  const validatedFields = FormSchema.safeParse({
    productName: formData.get('productName'),
    features: formData.get('features'),
    keywords: formData.get('keywords'),
    brandVoice: formData.get('brandVoice'),
    msrp: formData.get('msrp'),
    imageUrl: formData.get('imageUrl'), // Read the image URL from the form
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data. Please check your inputs.',
      data: null,
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { imageUrl, ...restOfData } = validatedFields.data;

  try {
    const result = await generateProductDescription({
      ...restOfData,
      imageUrl: imageUrl ?? undefined, // Pass existing URL or undefined
    } as GenerateProductDescriptionInput);
    return {
      message: 'Product description generated successfully.',
      data: result,
      error: false,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      message: `Failed to generate product description: ${errorMessage}`,
      data: null,
      error: true,
    };
  }
}

export async function createSocialMediaImage(
  prevState: ImageFormState,
  formData: FormData
): Promise<ImageFormState> {

  const validatedFields = FormSchema.pick({ productName: true, features: true, brandVoice: true }).safeParse({
    productName: formData.get('productName'),
    features: formData.get('features'),
    brandVoice: formData.get('brandVoice'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Product name, features, and brand voice are required to generate an image.',
      imageUrl: null,
      error: true,
    };
  }

  const logoDataUri = formData.get('logoDataUri') as string;
  if (!logoDataUri) {
    return {
      message: 'A brand logo is required to generate a watermarked image. Please upload one in Settings.',
      imageUrl: null,
      error: true,
    };
  }

  try {
    const result = await generateSocialMediaImage({
      ...validatedFields.data,
      logoDataUri,
    } as GenerateSocialMediaImageInput);
    
    return {
      message: 'Image generated successfully!',
      imageUrl: result.imageUrl,
      error: false,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      message: `Failed to generate image: ${errorMessage}`,
      imageUrl: null,
      error: true,
    };
  }
}

export async function summarizeProductReviews(
  prevState: ReviewSummaryFormState,
  formData: FormData
): Promise<ReviewSummaryFormState> {
  const productId = formData.get('productId') as string;
  const productName = formData.get('productName') as string;

  if (!productId || !productName) {
    return {
      message: 'Please select a product to summarize.',
      data: null,
      error: true,
    };
  }

  try {
    const result = await summarizeReviews({ productId, productName });
    return {
      message: 'Review summary generated successfully.',
      data: result,
      error: false,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      message: `Failed to summarize reviews: ${errorMessage}`,
      data: null,
      error: true,
    };
  }
}

/**
 * Updates the like or dislike count for a product in Firestore.
 * This action includes enhanced server-side validation for security.
 * @param productId The ID of the product to update.
 * @param feedbackType Whether to increment 'likes' or 'dislikes'.
 */
export async function updateProductFeedback(
  productId: string,
  feedbackType: 'like' | 'dislike'
): Promise<{ success: boolean; message: string }> {
  // 1. Input Validation: Ensure feedbackType is one of the allowed values.
  if (feedbackType !== 'like' && feedbackType !== 'dislike') {
      return { success: false, message: 'Invalid feedback type.' };
  }
  
  const { firestore } = await createServerClient();
  
  if (!productId) {
    return { success: false, message: 'Product ID is missing.' };
  }

  const productRef = firestore.doc(`products/${productId}`);
  
  // 2. Existence Check: Verify the product exists before trying to update it.
  try {
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
        return { success: false, message: `Product with ID ${productId} not found.` };
    }
  } catch (error) {
     console.error(`[updateProductFeedback] Error fetching product "${productId}":`, error);
     return { success: false, message: 'Could not verify product existence.' };
  }

  const fieldToUpdate = feedbackType === 'like' ? 'likes' : 'dislikes';
  const updatePayload = { [fieldToUpdate]: increment(1) };

  try {
    // Fire-and-forget using Admin SDK; keeps types consistent
    void productRef.update(updatePayload).catch((e) => {
      console.error('non-blocking update failed', e);
    });
    return { success: true, message: 'Feedback submitted successfully.' };
  } catch (serverError) {
    // This catch block might not be hit if the non-blocking one handles it,
    // but it's good for safety.
    const permissionError = new FirestorePermissionError({
      path: productRef.path,
      operation: 'update',
      requestResourceData: { [fieldToUpdate]: 'increment(1)' },
    });
    // This server-side error log is crucial for debugging security rule failures.
    console.error('[updateProductFeedback] Firestore permission error:', permissionError.message);
    
    return { success: false, message: 'Permission denied. Your security rules might be blocking this update.' };
  }
}
