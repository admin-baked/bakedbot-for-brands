
'use server';

import { z } from 'zod';
import { generateProductDescription, type GenerateProductDescriptionInput, type GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { generateSocialMediaImage, type GenerateSocialMediaImageInput, type GenerateSocialMediaImageOutput } from '@/ai/flows/generate-social-image';

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
