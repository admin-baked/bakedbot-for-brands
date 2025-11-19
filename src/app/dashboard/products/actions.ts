
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { makeProductRepo } from '@/server/repos/productRepo';
import { redirect } from 'next/navigation';

const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Product name must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  category: z.string().min(2, 'Category is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  imageUrl: z.string().url('Please enter a valid image URL.'),
  imageHint: z.string().optional(),
});

export type ProductFormState = {
  message: string;
  error: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function saveProduct(
  prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { auth } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    return { error: true, message: 'You must be logged in.' };
  }

  let decodedToken;
  try {
    decodedToken = await auth.verifySessionCookie(sessionCookie, true);
  } catch {
    return { error: true, message: 'Invalid session.' };
  }

  if (decodedToken.role !== 'brand' && decodedToken.role !== 'owner') {
    return { error: true, message: 'You are not authorized to save products.' };
  }

  const validatedFields = ProductSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { id: productId, ...productData } = validatedFields.data;
  const brandId = decodedToken.brandId;

  if (!brandId) {
    return { error: true, message: 'Your account is not associated with a brand.' };
  }

  const { firestore } = await createServerClient();
  const productRepo = makeProductRepo(firestore);
  
  try {
    if (productId) {
      // Update existing product
      const existingProduct = await productRepo.getById(productId);
      if (existingProduct?.brandId !== brandId) {
        return { error: true, message: 'You do not have permission to edit this product.' };
      }
      await productRepo.update(productId, { ...productData, brandId });
    } else {
      // Create new product
      await productRepo.create({ ...productData, brandId });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: true, message: `Failed to save product: ${errorMessage}` };
  }
  
  // Revalidate and redirect
  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}
