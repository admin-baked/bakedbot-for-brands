'use server';

import { generateProductDescription, type GenerateProductDescriptionInput, type GenerateProductDescriptionOutput } from '@/ai/flows/generate-product-description';
import { z } from 'zod';

const FormSchema = z.object({
  productName: z.string().min(3, 'Product name must be at least 3 characters.'),
  features: z.string().min(3, 'Features must be at least 3 characters.'),
  keywords: z.string().min(3, 'Keywords must be at least 3 characters.'),
  brandVoice: z.string().min(1, 'Please select a brand voice.'),
});

export type FormState = {
  message: string;
  data: GenerateProductDescriptionOutput | null;
  error: boolean;
  fieldErrors?: {
    [key: string]: string[] | undefined;
  };
};

export async function createProductDescription(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = FormSchema.safeParse({
    productName: formData.get('productName'),
    features: formData.get('features'),
    keywords: formData.get('keywords'),
    brandVoice: formData.get('brandVoice'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data. Please check your inputs.',
      data: null,
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await generateProductDescription(validatedFields.data as GenerateProductDescriptionInput);
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
