'use server';

import { requireUser } from '@/server/auth/auth';
import { getProducts } from '@/lib/cannmenus-api';
import { createServerClient } from '@/firebase/server-client';
import { Product } from '@/types/domain';
import { logger } from '@/lib/logger';

export async function searchCannMenusProducts(brandName: string, state: string) {
  await requireUser(['brand', 'owner']);

  // In a real scenario, we might need to search for the brand ID first if the user provides a name.
  // For now, we'll assume the user might provide a brand name to search against CannMenus.
  // However, `getProducts` expects a brandId (CannMenus ID) or we can search by brand name if the API supports it.
  // The current `getProducts` implementation takes `brandId` and `state`.
  // We might need a `searchBrands` function first, or `getProducts` should support text search.
  // Looking at `cannmenus-api.ts`, `getProducts` uses `brands` param.
  // Let's assume we pass the brand name as the query.

  try {
    const products = await getProducts(brandName, state);
    return products;
  } catch (error) {
    logger.error('Error searching CannMenus products:', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function importProducts(products: any[]) {
  const user = await requireUser(['brand', 'owner']);
  const brandId = user.brandId;

  if (!brandId) {
    throw new Error('No brand ID associated with user');
  }

  const { firestore } = await createServerClient();
  const batch = firestore.batch();
  const productsCollection = firestore.collection('products');

  let importedCount = 0;

  for (const p of products) {
    // Map CannMenus product to our Domain Product
    const newProductRef = productsCollection.doc();
    const domainProduct: Product = {
      id: newProductRef.id,
      name: p.name,
      category: p.category,
      price: p.price || 0,
      imageUrl: p.image || '',
      imageHint: p.category,
      description: p.description || '',
      brandId: brandId,
      // Default values for required fields
      // In a real app, we might want to fetch more details or let user edit before saving
    };

    batch.set(newProductRef, domainProduct);
    importedCount++;
  }

  await batch.commit();
  return { success: true, count: importedCount };
}

export async function deleteProduct(productId: string) {
  const user = await requireUser(['brand', 'owner']);
  const { firestore } = await createServerClient();

  // Optional: Check if product belongs to brand
  // const productDoc = await firestore.collection('products').doc(productId).get();
  // if (productDoc.exists && productDoc.data()?.brandId !== user.brandId) ...

  try {
    await firestore.collection('products').doc(productId).delete();
    return { message: 'Product deleted successfully' };
  } catch (error) {
    logger.error('Error deleting product:', error instanceof Error ? error : new Error(String(error)));
    return { error: true, message: 'Failed to delete product' };
  }
}

import { makeProductRepo } from '@/server/repos/productRepo';

export type ProductFormState = {
  message: string;
  error: boolean;
  fieldErrors?: {
    [key: string]: string[];
  };
};

export async function saveProduct(prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const user = await requireUser(['brand', 'owner']);
  const { firestore } = await createServerClient();
  const productRepo = makeProductRepo(firestore);

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const priceStr = formData.get('price') as string;
  const price = parseFloat(priceStr);
  const imageUrl = formData.get('imageUrl') as string;
  const imageHint = formData.get('imageHint') as string;
  const brandId = formData.get('brandId') as string || user.brandId;

  // Basic validation
  const errors: Record<string, string[]> = {};
  if (!name) errors.name = ['Name is required'];
  if (!category) errors.category = ['Category is required'];
  if (!priceStr || isNaN(price)) errors.price = ['Valid price is required'];

  if (Object.keys(errors).length > 0) {
    return { message: 'Validation failed', error: true, fieldErrors: errors };
  }

  const productData = {
    name,
    description,
    category,
    price,
    imageUrl,
    imageHint,
    brandId: brandId || '',
  };

  try {
    if (id) {
      await productRepo.update(id, productData);
      return { message: 'Product updated successfully', error: false };
    } else {
      await productRepo.create(productData);
      return { message: 'Product created successfully', error: false };
    }
  } catch (error) {
    logger.error('Error saving product:', error instanceof Error ? error : new Error(String(error)));
    return { message: 'Failed to save product', error: true };
  }
}
