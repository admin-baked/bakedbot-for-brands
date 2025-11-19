
'use server';

import { z } from 'zod';
import { generateProductDescription, type GenerateProductDescriptionInput, type GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { generateSocialMediaImage, type GenerateSocialMediaImageInput, type GenerateSocialMediaImageOutput } from '@/ai/flows/generate-social-image';
import { runSummarizeReviews, type SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { makeProductRepo } from '@/server/repos/productRepo';
import { createServerClient } from '@/firebase/server-client';
import { demoCustomer, demoProducts } from '@/lib/data';
import type { Review } from '@/types/domain';
import { reviewConverter } from '@/firebase/converters';
import { revalidatePath } from 'next/cache';

// --- Description Generation ---

const DescriptionFormSchema = z.object({
  productName: z.string().min(3, 'Product name is required.'),
  features: z.string().min(10, 'Please provide some key features.'),
  keywords: z.string().optional(),
  brandVoice: z.string().min(2, 'Brand voice is required.'),
  msrp: z.string().optional(),
  imageUrl: z.string().optional(),
  productId: z.string().optional(),
});

export type DescriptionFormState = {
  message: string;
  error: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: GenerateProductDescriptionOutput & { productId?: string };
};

export async function createProductDescription(
  prevState: DescriptionFormState,
  formData: FormData
): Promise<DescriptionFormState> {
  const validatedFields = DescriptionFormSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data. Please check your inputs.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await generateProductDescription(validatedFields.data as GenerateProductDescriptionInput);
    return {
      message: 'Successfully generated description!',
      error: false,
      data: { ...result, productId: validatedFields.data.productId },
    };
  } catch (e: any) {
    return {
      message: `AI generation failed: ${e.message}`,
      error: true,
    };
  }
}


// --- Image Generation ---

const ImageFormSchema = z.object({
  productName: z.string().min(3, 'Product name or a prompt is required.'),
  features: z.string().min(10, 'Please provide some key features or a prompt.'),
  brandVoice: z.string().min(2, 'Brand voice is required.'),
  logoDataUri: z.string().min(1, 'Logo data URI is missing.'),
  imageUrl: z.string().optional(), // This is the packaging image
});


export type ImageFormState = {
  message: string;
  imageUrl: string | null;
  error: boolean;
};

export async function createSocialMediaImage(
    prevState: ImageFormState,
    formData: FormData
): Promise<ImageFormState> {
    const validatedFields = ImageFormSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        // This is a developer error if it happens, as fields are hidden/set automatically
        return {
            message: 'Internal error: Invalid data for image generation.',
            imageUrl: null,
            error: true,
        };
    }

    try {
        const result = await generateSocialMediaImage(validatedFields.data as GenerateSocialMediaImageInput);
        if (result.imageUrl) {
            return {
                message: 'Image generated successfully!',
                imageUrl: result.imageUrl,
                error: false,
            };
        }
        throw new Error('The AI model did not return an image URL.');
    } catch (e: any) {
        return {
            message: `Image generation failed. This can happen due to safety filters or temporary model issues. Please adjust your prompt and try again. Error: ${e.message}`,
            imageUrl: null,
            error: true,
        };
    }
}


// --- Review Summarization ---

const ReviewSummarySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product Name is required'),
  brandId: z.string().optional(),
});


export type ReviewSummaryFormState = {
    message: string;
    data: SummarizeReviewsOutput | null;
    error: boolean;
};


export async function summarizeProductReviews(prevState: ReviewSummaryFormState, formData: FormData): Promise<ReviewSummaryFormState> {
    const validatedFields = ReviewSummarySchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { message: "Invalid product selection.", data: null, error: true };
    }
    
    const { productId, productName, brandId = 'default' } = validatedFields.data;

    try {
        let reviews: Review[];
        // Simplified demo vs. live logic for fetching reviews
        if (productId.startsWith('demo-')) {
            reviews = (demoCustomer.reviews as Review[]).filter(r => r.productId === productId);
        } else {
            const { firestore } = await createServerClient();
            const reviewsSnap = await (firestore as any).collection(`products/${productId}/reviews`).withConverter(reviewConverter as any).get();
            reviews = reviewsSnap.docs.map((d: any) => d.data() as Review);
        }
        
        const summary = await runSummarizeReviews({
            productId,
            brandId,
            productName,
            reviewTexts: reviews.map(r => r.text)
        });

        if (!summary) {
            return { message: "Could not generate summary.", data: null, error: true };
        }
        
        return { message: "Summary generated.", data: summary, error: false };
    } catch (e: any) {
        return { message: `An error occurred: ${e.message}`, data: null, error: true };
    }
}

// --- Apply Content to Product ---

export type ApplyContentFormState = {
  message: string;
  error: boolean;
};

const ApplyContentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required.'),
  description: z.string().min(1, 'Description is required.'),
});

export async function applyGeneratedContentToProduct(
  prevState: ApplyContentFormState,
  formData: FormData
): Promise<ApplyContentFormState> {
  const validatedFields = ApplyContentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    return { message: 'Invalid data.', error: true };
  }

  const { firestore, auth } = await createServerClient();
  const productRepo = makeProductRepo(firestore);
  
  try {
    const { productId, description } = validatedFields.data;
    await productRepo.update(productId, { description });
    
    revalidatePath(`/dashboard/products`);
    revalidatePath(`/dashboard/products/${productId}/edit`);

    return { message: 'Product description updated successfully!', error: false };
  } catch (e: any) {
    return { message: `Failed to apply content: ${e.message}`, error: true };
  }
}
