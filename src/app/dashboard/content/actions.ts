'use server';

import { generateBlogPost, type GenerateBlogPostInput, type GenerateBlogPostOutput } from '@/ai/flows/generate-blog-posts';
import { z } from 'zod';

const FormSchema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters.'),
  productType: z.string().min(3, 'Product type must be at least 3 characters.'),
  keywords: z.string().min(3, 'Keywords must be at least 3 characters.'),
  tone: z.string().min(1, 'Please select a tone.'),
  length: z.string().min(1, 'Please select a length.'),
});

export type FormState = {
  message: string;
  data: GenerateBlogPostOutput | null;
  error: boolean;
  fieldErrors?: {
    [key: string]: string[] | undefined;
  };
};

export async function createBlogPost(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = FormSchema.safeParse({
    topic: formData.get('topic'),
    productType: formData.get('productType'),
    keywords: formData.get('keywords'),
    tone: formData.get('tone'),
    length: formData.get('length'),
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
    const result = await generateBlogPost(validatedFields.data as GenerateBlogPostInput);
    return {
      message: 'Blog post generated successfully.',
      data: result,
      error: false,
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return {
      message: `Failed to generate blog post: ${errorMessage}`,
      data: null,
      error: true,
    };
  }
}
