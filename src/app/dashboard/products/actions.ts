
'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { makeProductRepo } from '@/server/repos/productRepo';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';

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
  let user;
  try {
    user = await requireUser(['brand', 'owner']);
  } catch (error) {
    return { error: true, message: 'Unauthorized.' };
  }
  
  const brandId = user.brandId;
  if (!brandId) {
    return { error: true, message: 'Your account is not associated with a brand.' };
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
  const { firestore } = await createServerClient();
  const productRepo = makeProductRepo(firestore);
  
  try {
    const dataToSave = {
      ...productData,
      brandId,
      imageHint: productData.imageHint ?? '',
    };
    
    if (productId) {
      // Update: Ensure user owns this product
      const existingProduct = await productRepo.getById(productId);
      if (existingProduct?.brandId !== brandId) {
        return { error: true, message: 'You do not have permission to edit this product.' };
      }
      await productRepo.update(productId, dataToSave);
    } else {
      // Create
      await productRepo.create(dataToSave);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { error: true, message: `Failed to save product: ${errorMessage}` };
  }
  
  // Revalidate and redirect
  revalidatePath('/dashboard/products');
  redirect('/dashboard/products');
}
