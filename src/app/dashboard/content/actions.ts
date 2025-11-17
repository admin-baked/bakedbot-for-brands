
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
  runSummarizeReviews,
  type SummarizeReviewsInput,
  type SummarizeReviewsOutput,
} from '@/ai/flows/summarize-reviews';
import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { FirestorePermissionError } from '@/firebase/errors';
import { headers } from 'next/headers';


const DescriptionFormSchema = z.object({
  productName: z.string().min(3, 'Product name must be at least 3 characters.'),
  productId: z.string().optional(),
  features: z.string().min(3, 'Features must be at least 3 characters.'),
  keywords: z.string().min(3, 'Keywords must be at least 3 characters.'),
  brandVoice: z.string().min(1, 'Please select a brand voice.'),
  msrp: z.string().optional(),
  imageUrl: z.string().optional(),
});

const ImageFormSchema = z.object({
    productName: z.string().min(3, 'A title or product name is required.'),
    features: z.string().min(3, 'A visual prompt is required.'),
    brandVoice: z.string().min(1, 'Please select a brand voice.'),
    imageUrl: z.string().optional(),
    logoDataUri: z.string(),
});


export type DescriptionFormState = {
  message: string;
  data: (GenerateProductDescriptionOutput & { productId?: string }) | null;
  error: boolean;
  fieldErrors?: {
    [key: string]: string[] | undefined;
  };
};

export type ImageFormState = {
  message: string;
  imageUrl: string | null;
  error: boolean;
  fieldErrors?: {
    [key: string]: string[] | undefined;
  };
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
  const validatedFields = DescriptionFormSchema.safeParse({
    productName: formData.get('productName'),
    productId: formData.get('productId'),
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
  
  const { imageUrl, productId, ...restOfData } = validatedFields.data;

  try {
    const result = await generateProductDescription({
      ...restOfData,
      imageUrl: imageUrl ?? undefined, // Pass existing URL or undefined
    } as GenerateProductDescriptionInput);

    return {
      message: 'Product description generated successfully.',
      data: { ...result, productId, imageUrl: imageUrl || result.imageUrl }, // Persist the input image URL
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

  const validatedFields = ImageFormSchema.safeParse({
    productName: formData.get('productName'),
    features: formData.get('features'),
    brandVoice: formData.get('brandVoice'),
    imageUrl: formData.get('imageUrl'),
    logoDataUri: formData.get('logoDataUri'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid image prompt data.',
      imageUrl: null,
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { logoDataUri } = validatedFields.data;
  if (!logoDataUri) {
    return {
      message: 'A brand logo is required to generate a watermarked image. Please upload one in Settings.',
      imageUrl: null,
      error: true,
    };
  }

  try {
    const result = await generateSocialMediaImage(validatedFields.data as GenerateSocialMediaImageInput);
    
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

  if (!productId) {
    return {
      message: 'Please select a product to summarize.',
      data: null,
      error: true,
    };
  }

  try {
    // To securely call the tool, we need the brandId.
    // Fetch the product doc on the server to get it.
    const { firestore } = await createServerClient();
    const productSnap = await firestore.collection('products').doc(productId).get();

    if (!productSnap.exists) {
        throw new Error(`Product with ID ${productId} not found.`);
    }

    const productData = productSnap.data();

    // Use the brandId from the product if it exists, otherwise use a placeholder.
    const brandId = productData?.brandId || 'bakedbot-brand-id'; 
    
    const result = await runSummarizeReviews({ productId, brandId });
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
