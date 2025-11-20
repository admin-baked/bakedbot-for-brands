

'use server';

import { z } from 'zod';
import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { makeProductRepo } from '@/server/repos/productRepo';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import { DEMO_BRAND_ID } from '@/lib/config';

const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Product name must be at least 3 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  category: z.string().min(2, 'Category is required.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  imageUrl: z.string().url('Please enter a valid image URL.'),
  imageHint: z.string().optional(),
  // Add brandId to the schema for owner-role submissions
  brandId: z.string().optional(),
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
  
  let brandId: string | null = null;

  if (user.role === 'owner') {
    // For owners, brandId comes from the form.
    brandId = formData.get('brandId') as string;
    if (!brandId) {
        return { error: true, message: 'As an owner, you must select a brand.' };
    }
  } else {
    // For brand managers, it comes from their token.
    brandId = user.brandId;
  }

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
      brandId: brandId, // Use the determined brandId
      imageHint: productData.imageHint ?? '',
    };
    
    if (productId) {
      // Update: Ensure user owns this product
      const existingProduct = await productRepo.getById(productId);
      if (existingProduct?.brandId !== brandId && user.role !== 'owner') {
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


export async function deleteProduct(productId: string): Promise<ProductFormState> {
    let user;
    try {
        user = await requireUser(['brand', 'owner']);
    } catch (error) {
        return { error: true, message: 'Unauthorized.' };
    }

    const brandId = user.brandId;
    if (!brandId && user.role !== 'owner') {
        return { error: true, message: 'You are not associated with a brand.' };
    }
    
    if (!productId) {
        return { error: true, message: 'Product ID is missing.' };
    }

    try {
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);

        // Security check: Verify the product belongs to the user's brand before deleting.
        const product = await productRepo.getById(productId);
        if (!product) {
            return { error: true, message: 'Product not found.' };
        }

        if (user.role !== 'owner' && product.brandId !== brandId) {
            return { error: true, message: 'Forbidden: You do not have permission to delete this product.' };
        }

        await productRepo.delete(productId);

        revalidatePath('/dashboard/products');
        return { error: false, message: 'Product deleted successfully.' };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { error: true, message: `Failed to delete product: ${errorMessage}` };
    }
}
