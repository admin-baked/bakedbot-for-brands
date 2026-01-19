'use server';

import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { Product } from '@/types/domain';
import { logger } from '@/lib/logger';
import { CannMenusService } from '@/server/services/cannmenus';
import { FREE_ACCOUNT_LIMITS } from '@/lib/config/limits';
import type { ExtractedProduct } from '@/app/api/demo/import-menu/route';

/**
 * Save products imported from URL to the user's catalog
 * Used by the URL Import feature in onboarding
 */
export async function saveImportedProducts(
    products: ExtractedProduct[]
): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const user = await requireUser(['brand', 'super_user', 'dispensary']);
        const { firestore } = await createServerClient();

        // Determine the organization ID based on role
        const orgId = user.brandId || user.locationId || user.uid;
        if (!orgId) {
            return { success: false, error: 'No organization found for user' };
        }

        const batch = firestore.batch();
        const productsCollection = firestore.collection('products');
        let importedCount = 0;

        for (const p of products) {
            const newProductRef = productsCollection.doc();
            const domainProduct: Product = {
                id: newProductRef.id,
                name: p.name,
                category: p.category,
                price: p.price || 0,
                imageUrl: p.imageUrl || '',
                imageHint: p.category.toLowerCase(),
                description: p.description || '',
                brandId: orgId,
                thcPercent: p.thcPercent || undefined,
                cbdPercent: p.cbdPercent || undefined,
                strainType: p.strainType,
                effects: p.effects || [],
                source: 'url-import',
                sourceTimestamp: new Date(),
            };

            batch.set(newProductRef, domainProduct);
            importedCount++;
        }

        await batch.commit();

        logger.info('[URL Import] Products saved successfully', {
            userId: user.uid,
            orgId,
            count: importedCount,
        });

        return { success: true, count: importedCount };
    } catch (error) {
        logger.error('[URL Import] Failed to save products', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to save products',
        };
    }
}

// Mock fallback results for demo
const MOCK_PRODUCTS = [
  { id: 'mock-1', name: 'Jeeter Juice Liquid Diamonds', category: 'Vape', price: 45.00, brand: 'Jeeter', image: '', description: 'Premium liquid diamonds vape cartridge', effects: ['Euphoric', 'Relaxed'], source: 'discovery' },
  { id: 'mock-2', name: 'Baby Jeeter Infused - Watermelon Zkittlez', category: 'Pre-roll', price: 35.00, brand: 'Jeeter', image: '', description: 'Infused pre-roll pack', effects: ['Happy', 'Creative'], source: 'discovery' },
  { id: 'mock-3', name: 'Stiiizy Premium Jack Herer', category: 'Vape', price: 40.00, brand: 'Stiiizy', image: '', description: 'Sativa pod', effects: ['Energetic', 'Focused'], source: 'discovery' },
  { id: 'mock-4', name: 'Wyld Huckleberry Gummies', category: 'Edible', price: 20.00, brand: 'Wyld', image: '', description: 'Hybrid enhanced gummies', effects: ['Balanced'], source: 'discovery' },
  { id: 'mock-5', name: 'Camino Midnight Blueberry', category: 'Edible', price: 22.00, brand: 'Kiva', image: '', description: 'Sleep inducing gummies', effects: ['Sleepy'], source: 'discovery' }
];

export type ImportCandidate = {
  id: string; // SKU or unique ref
  name: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  description: string;
  effects: string[];
  source: 'cannmenus' | 'discovery';
  // Checkboxes for user verification
  retailerName?: string;
  retailerId?: string;
  retailerState?: string;
};

export async function searchCannMenusProducts(brandName: string): Promise<ImportCandidate[]> {
  await requireUser(['brand', 'super_user', 'dispensary']);

  try {
    // 1. Try CannMenus Service (API)
    const cmService = new CannMenusService();
    // Use generic search to find products by brand
    // NOTE: This searches CannMenus global product catalog.
    const { products } = await cmService.searchProducts({ brands: brandName, limit: 100 });

    if (products && products.length > 0) {
      return products.map(p => ({
        id: p.cann_sku_id,
        name: p.product_name,
        brand: p.brand_name || brandName,
        category: p.category,
        price: p.latest_price,
        image: p.image_url,
        description: p.description || '',
        effects: p.effects || [],
        source: 'cannmenus',
        retailerName: p.retailer_name, // Populated from type update
        retailerId: typeof p.retailer_id === 'number' ? String(p.retailer_id) : p.retailer_id,
        retailerState: p.state
      }));
    }

    return [];

  } catch (error) {
    logger.error('Error searching CannMenus products:', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function linkBrandProducts(products: ImportCandidate[]) {
  const user = await requireUser(['brand', 'super_user']);
  const brandId = user.brandId;
  
  if (!brandId) {
    throw new Error('No brand ID found for user');
  }

  const { firestore } = await createServerClient();
  const orgRef = firestore.collection('organizations').doc(brandId);
  const orgDoc = await orgRef.get();
  const orgData = orgDoc.data();

  // 1. One-Time Confirmation Check
  if (orgData?.productsLinked && user.role !== 'super_user') {
     throw new Error('Products have already been linked for this brand. Contact support for updates.');
  }
  
  // 2. Enforce Product Limits (Trial)
  // ... (keep logic if needed, or rely on strict one-time confirmation)
  // Re-using existing check from previous importProducts (consolidated here)

  const batch = firestore.batch();
  const productsCollection = firestore.collection('products');
  let importedCount = 0;

  for (const p of products) {
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
      source: p.source || 'cannmenus', 
      sourceTimestamp: new Date(),
      // Store retailer info if we found it? Domain Product schema doesn't have it yet, maybe tags?
      // Optional: Update Product type later if needed. For now, basic import.
    };

    batch.set(newProductRef, domainProduct);
    importedCount++;
  }

  // 3. Lock Brand Logic
  batch.update(orgRef, {
      productsLinked: true,
      nameLocked: true, 
      productsLastLinkedAt: new Date(),
      linkedByUserId: user.uid
  });

  await batch.commit();
  return { success: true, count: importedCount };
}

// Keeping fallback for generic calls if needed, but UI uses linkBrandProducts now
export async function importProducts(products: any[]) { 
    // Redirect to new secure method
    // Mapping any[] to ImportCandidate[] best effort
    const candidates: ImportCandidate[] = products.map(p => ({
        ...p,
        id: p.id || 'unknown',
        brand: p.brand || '',
        effects: p.effects || [],
        source: p.source || 'manual'
    }));
    return linkBrandProducts(candidates);
}

export async function deleteProduct(productId: string) {
  const user = await requireUser(['brand', 'super_user', 'dispensary']);
  const { firestore } = await createServerClient();

  try {
    const productRef = firestore.collection('products').doc(productId);
    const doc = await productRef.get();
    
    if (!doc.exists) return { error: true, message: 'Product not found' };
    
    const data = doc.data();
    // Ownership Check
    if (user.role !== 'super_user') {
        const ownerId = user.brandId || user.locationId || user.uid;
        // Check both brandId and generic ownership fields if they exist
        if (data?.brandId !== ownerId && data?.dispensaryId !== ownerId) {
             return { error: true, message: 'Unauthorized: You do not own this product' };
        }
    }

    await productRef.delete();
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
  const user = await requireUser(['brand', 'super_user', 'dispensary']);
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
  const featured = formData.get('featured') === 'on';
  const sortOrderStr = formData.get('sortOrder') as string;
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : undefined;
  
  // SECURITY: Enforce brandId from session unless super_user
  let brandId = user.brandId || user.locationId || user.uid;
  if (user.role === 'super_user') {
      brandId = (formData.get('brandId') as string) || brandId;
  }

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
    brandId: brandId || user.uid,
    source: 'manual' as const, // Explicit manual source
    sourceTimestamp: new Date(),
    featured,
    sortOrder,
  };

  try {
    if (id) {
      // Ownership check for update
      if (user.role !== 'super_user') {
          const existing = await productRepo.getById(id);
          const ownerId = user.brandId || user.locationId || user.uid;
          if (existing && existing.brandId !== ownerId && (existing as any).dispensaryId !== ownerId) {
              return { message: 'Unauthorized update', error: true };
          }
      }
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

export async function getBrandStatus() {
  const user = await requireUser(['brand', 'super_user']);
  const { firestore } = await createServerClient();
  const brandId = user.brandId;

  if (!brandId) return null;

  const orgDoc = await firestore.collection('organizations').doc(brandId).get();
  const billing = orgDoc.data()?.billing;
  const isTrial = billing?.subscriptionStatus === 'trial';

  const currentProducts = await firestore.collection('products')
    .where('brandId', '==', brandId)
    .get();

  return {
    isTrial,
    count: currentProducts.size,
    max: FREE_ACCOUNT_LIMITS.brand.products,
    nameLocked: !!orgDoc.data()?.nameLocked,
    productsLinked: !!orgDoc.data()?.productsLinked
  };
}
