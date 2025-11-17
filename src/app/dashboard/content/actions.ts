
"use server";

import { z } from 'zod';
import { generateProductDescription } from '@/ai/flows/generate-product-description';
import { generateSocialMediaImage } from '@/ai/flows/generate-social-image';
import { getReviewSummary } from '@/app/products/[id]/actions';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';


// Shared type for the summary data
export type ReviewSummaryData = {
  pros: string[];
  cons: string[];
  summary: string;
  reviewCount: number;
};

export type DescriptionFormState = {
  message: string;
  data: {
    productName: string;
    description: string;
    imageUrl?: string;
    msrp?: string;
    productId?: string;
  } | null;
  error: boolean | string | null;
  fieldErrors?: any;
};

export type ImageFormState = {
  message: string;
  imageUrl: string | null;
  error: boolean | string | null;
  fieldErrors?: any;
};

export type ReviewSummaryFormState = {
  message: string;
  data: ReviewSummaryData | null;
  error: boolean | string | null;
};


const ProductDescriptionSchema = z.object({
  productName: z.string().min(1, "Product name is required."),
  features: z.string().min(10, "Please provide some key features."),
  keywords: z.string().optional(),
  brandVoice: z.string().min(1, "Brand voice is required."),
  msrp: z.string().optional(),
  imageUrl: z.string().optional(),
  productId: z.string().optional(),
});

export async function createProductDescription(
  prevState: DescriptionFormState,
  formData: FormData,
): Promise<DescriptionFormState> {
  const validatedFields = ProductDescriptionSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      message: "Invalid form data.",
      data: null,
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await generateProductDescription({
        ...validatedFields.data,
        keywords: validatedFields.data.keywords || ""
    });
    return {
      message: "Description generated successfully.",
      data: { ...result, productId: validatedFields.data.productId },
      error: false,
    };
  } catch (e: any) {
    return {
      message: `Generation failed: ${e.message}`,
      data: null,
      error: true,
    };
  }
}

const SocialImageSchema = z.object({
  productName: z.string().min(1, "Product name or title is required."),
  features: z.string().min(10, "Please provide a prompt or some features."),
  brandVoice: z.string().min(1, "Brand voice is required."),
  logoDataUri: z.string().min(1, "Logo is missing."),
  imageUrl: z.string().optional(),
  productId: z.string().optional(),
});

export async function createSocialMediaImage(
  prevState: ImageFormState,
  formData: FormData,
): Promise<ImageFormState> {
  const validatedFields = SocialImageSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      message: "Invalid form data for image generation.",
      imageUrl: null,
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await generateSocialMediaImage(validatedFields.data);
    return {
      message: "Image generated successfully!",
      imageUrl: result.imageUrl,
      error: false,
    };
  } catch (e: any) {
    return {
      message: `Image generation failed: ${e.message}`,
      imageUrl: null,
      error: true,
    };
  }
}

const SummarizeReviewsSchema = z.object({
    productId: z.string().min(1, "Product ID is required."),
    productName: z.string().optional(),
});

export async function summarizeProductReviews(
  prevState: ReviewSummaryFormState,
  formData: FormData,
): Promise<ReviewSummaryFormState> {
  const validatedFields = SummarizeReviewsSchema.safeParse(Object.fromEntries(formData));

  if (!validatedFields.success) {
    return {
      message: "Invalid input. Please select a product.",
      data: null,
      error: true,
    };
  }
  
  const { productId } = validatedFields.data;

  try {
    const summary = await getReviewSummary({ productId });
    
    if (!summary) {
      return {
        message: "Could not generate a summary for this product.",
        data: null,
        error: true,
      };
    }
    
    return {
      message: "Summary generated successfully.",
      data: summary,
      error: false,
    };

  } catch (e: any) {
    return {
      message: `Failed to summarize reviews: ${e.message}`,
      data: null,
      error: true,
    };
  }
}
