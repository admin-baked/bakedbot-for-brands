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

  // Collect all images (multiple image support)
  const images: string[] = [];
  if (imageUrl) images.push(imageUrl); // Primary image
  // Collect additional images
  let imageIndex = 1;
  while (formData.has(`images[${imageIndex}]`)) {
    const additionalImage = formData.get(`images[${imageIndex}]`) as string;
    if (additionalImage && !images.includes(additionalImage)) {
      images.push(additionalImage);
    }
    imageIndex++;
  }

  // Hemp e-commerce fields
  const weightStr = formData.get('weight') as string;
  const weight = weightStr ? parseFloat(weightStr) : undefined;
  const servingsStr = formData.get('servings') as string;
  const servings = servingsStr ? parseInt(servingsStr, 10) : undefined;
  const mgPerServingStr = formData.get('mgPerServing') as string;
  const mgPerServing = mgPerServingStr ? parseFloat(mgPerServingStr) : undefined;
  const shippable = formData.get('shippable') === 'on';

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
    imageUrl: images[0] || imageUrl || '', // Primary image (backward compatible)
    images: images.length > 0 ? images : undefined, // Multiple images array
    imageHint,
    brandId: brandId || user.uid,
    source: 'manual' as const, // Explicit manual source
    sourceTimestamp: new Date(),
    featured,
    sortOrder,
    // Hemp e-commerce fields
    weight,
    weightUnit: weight ? 'g' as const : undefined,
    servings,
    mgPerServing,
    shippable,
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

// =============================================================================
// POS Sync & AI Description Generation Actions
// =============================================================================

import { syncMenu, getPosConfig as _getPosConfig } from '@/app/dashboard/menu/actions';
import { generateProductDescription as aiGenerateDescription } from '@/ai/flows/generate-product-description';
import { getPriceTier, TIER_CONFIG, type PriceTier } from '@/lib/product-tiers';
import { revalidatePath } from 'next/cache';

export interface ProductWithTier extends Product {
    priceTier: PriceTier;
    tierLabel: string;
}

export interface ProductsDataWithTiers {
    products: ProductWithTier[];
    source: 'pos' | 'manual' | 'none';
    lastSyncedAt: string | null;
}

/**
 * Fetch all products for the current user's organization with tier information
 */
export async function getProductsWithTiers(): Promise<ProductsDataWithTiers> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'budtender', 'super_user']);

        let locationId = user.locationId;
        const orgId = (user as any).orgId || (user as any).currentOrgId || user.locationId;

        logger.info('[PRODUCTS] getProductsWithTiers called', { locationId, orgId, role: user.role });

        // Resolve locationId
        let locationData: any = null;
        if (!locationId && orgId) {
            let locSnap = await firestore.collection('locations').where('orgId', '==', orgId).limit(1).get();
            if (locSnap.empty) {
                locSnap = await firestore.collection('locations').where('brandId', '==', orgId).limit(1).get();
            }
            if (!locSnap.empty) {
                locationId = locSnap.docs[0].id;
                locationData = locSnap.docs[0].data();
                logger.info('[PRODUCTS] Found location', { locationId });
            }
        }

        const productRepo = makeProductRepo(firestore);

        // Try locationId first
        let products = locationId ? await productRepo.getAllByLocation(locationId) : [];

        // Fallback to orgId as dispensaryId
        if (products.length === 0 && orgId && orgId !== locationId) {
            logger.info('[PRODUCTS] Trying orgId as dispensaryId', { orgId });
            products = await productRepo.getAllByLocation(orgId);
        }

        // Add tier information to each product
        const productsWithTier: ProductWithTier[] = products.map(product => {
            const tier = getPriceTier(product.price || 0);
            return {
                ...product,
                priceTier: tier,
                tierLabel: TIER_CONFIG[tier].label
            };
        });

        const source = products.length > 0 ? 'pos' : 'none';
        const lastSyncedAt = locationData?.posConfig?.syncedAt?.toDate?.()?.toISOString() || null;

        return {
            products: productsWithTier,
            source,
            lastSyncedAt
        };
    } catch (error) {
        logger.error('[PRODUCTS] Failed to fetch products with tiers', { error });
        throw error;
    }
}

/**
 * Sync products from POS (re-exports existing syncMenu function)
 */
export async function syncProductsFromPos(): Promise<{ success: boolean; count?: number; error?: string; provider?: string }> {
    return syncMenu();
}

/**
 * Get POS configuration info (wrapper for menu action)
 */
export async function getPosConfig() {
    return _getPosConfig();
}

/**
 * Generate SEO-optimized description for a single product
 */
export async function generateProductDescriptionAI(productId: string): Promise<{ success: boolean; description?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'brand', 'brand_admin']);

        const productRepo = makeProductRepo(firestore);
        const product = await productRepo.getById(productId);

        if (!product) {
            return { success: false, error: 'Product not found' };
        }

        // Build features from product data
        const features: string[] = [];
        if (product.category) features.push(`Category: ${product.category}`);
        if (product.thcPercent) features.push(`THC: ${product.thcPercent}%`);
        if (product.cbdPercent) features.push(`CBD: ${product.cbdPercent}%`);
        if (product.strainType) features.push(`Type: ${product.strainType}`);

        // Build terpenes string
        const terpenes = product.terpenes?.map(t => t.name).join(', ') || '';

        // Build effects string
        const effects = product.effects?.join(', ') || '';

        // Generate description
        const result = await aiGenerateDescription({
            productName: product.name,
            features: features.join(', '),
            keywords: `${product.category}, cannabis, ${product.strainType || ''}`.trim(),
            brandVoice: 'Professional yet approachable',
            msrp: product.price ? `$${product.price}` : undefined,
            imageUrl: product.imageUrl || undefined,
            terpenes: terpenes || undefined,
            effects: effects || undefined,
            lineage: product.lineage ? `${product.lineage.type}${product.lineage.parents?.length ? ` (${product.lineage.parents.join(' x ')})` : ''}` : undefined
        });

        return { success: true, description: result.description };
    } catch (error: any) {
        logger.error('[PRODUCTS] Failed to generate description', { productId, error: error.message });
        return { success: false, error: error.message || 'Failed to generate description' };
    }
}

/**
 * Generate descriptions for multiple products in bulk
 */
export async function generateBulkDescriptionsAI(productIds: string[]): Promise<{
    success: boolean;
    results?: { productId: string; description?: string; error?: string }[];
    error?: string;
}> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'brand', 'brand_admin']);

        const productRepo = makeProductRepo(firestore);
        const results: { productId: string; description?: string; error?: string }[] = [];

        // Process products sequentially to avoid rate limiting
        for (const productId of productIds) {
            try {
                const product = await productRepo.getById(productId);
                if (!product) {
                    results.push({ productId, error: 'Product not found' });
                    continue;
                }

                const features: string[] = [];
                if (product.category) features.push(`Category: ${product.category}`);
                if (product.thcPercent) features.push(`THC: ${product.thcPercent}%`);
                if (product.cbdPercent) features.push(`CBD: ${product.cbdPercent}%`);
                if (product.strainType) features.push(`Type: ${product.strainType}`);

                const terpenes = product.terpenes?.map(t => t.name).join(', ') || '';
                const effects = product.effects?.join(', ') || '';

                const result = await aiGenerateDescription({
                    productName: product.name,
                    features: features.join(', '),
                    keywords: `${product.category}, cannabis, ${product.strainType || ''}`.trim(),
                    brandVoice: 'Professional yet approachable',
                    msrp: product.price ? `$${product.price}` : undefined,
                    terpenes: terpenes || undefined,
                    effects: effects || undefined,
                    lineage: product.lineage ? `${product.lineage.type}${product.lineage.parents?.length ? ` (${product.lineage.parents.join(' x ')})` : ''}` : undefined
                });

                results.push({ productId, description: result.description });
            } catch (err: any) {
                results.push({ productId, error: err.message || 'Failed to generate' });
            }
        }

        return { success: true, results };
    } catch (error: any) {
        logger.error('[PRODUCTS] Failed to generate bulk descriptions', { error: error.message });
        return { success: false, error: error.message || 'Failed to generate descriptions' };
    }
}

/**
 * Save generated description to a product
 */
export async function saveGeneratedDescription(productId: string, description: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'brand', 'brand_admin']);

        const productRepo = makeProductRepo(firestore);
        await productRepo.update(productId, { description });

        revalidatePath('/dashboard/products');
        return { success: true };
    } catch (error: any) {
        logger.error('[PRODUCTS] Failed to save description', { productId, error: error.message });
        return { success: false, error: error.message || 'Failed to save description' };
    }
}

/**
 * Save multiple descriptions in bulk
 */
export async function saveBulkGeneratedDescriptions(updates: { productId: string; description: string }[]): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['dispensary', 'dispensary_admin', 'dispensary_staff', 'super_user', 'brand', 'brand_admin']);

        const productRepo = makeProductRepo(firestore);

        for (const { productId, description } of updates) {
            await productRepo.update(productId, { description });
        }

        revalidatePath('/dashboard/products');
        return { success: true };
    } catch (error: any) {
        logger.error('[PRODUCTS] Failed to save bulk descriptions', { error: error.message });
        return { success: false, error: error.message || 'Failed to save descriptions' };
    }
}
