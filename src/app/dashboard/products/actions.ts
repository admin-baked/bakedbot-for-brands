'use server';

import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { Product } from '@/types/domain';
import { logger } from '@/lib/logger';
import { CannMenusService } from '@/server/services/cannmenus';

// Mock fallback results for demo
const MOCK_PRODUCTS = [
  { id: 'mock-1', name: 'Jeeter Juice Liquid Diamonds', category: 'Vape', price: 45.00, brand: 'Jeeter', image: '', description: 'Premium liquid diamonds vape cartridge', effects: ['Euphoric', 'Relaxed'], source: 'scrape' },
  { id: 'mock-2', name: 'Baby Jeeter Infused - Watermelon Zkittlez', category: 'Pre-roll', price: 35.00, brand: 'Jeeter', image: '', description: 'Infused pre-roll pack', effects: ['Happy', 'Creative'], source: 'scrape' },
  { id: 'mock-3', name: 'Stiiizy Premium Jack Herer', category: 'Vape', price: 40.00, brand: 'Stiiizy', image: '', description: 'Sativa pod', effects: ['Energetic', 'Focused'], source: 'scrape' },
  { id: 'mock-4', name: 'Wyld Huckleberry Gummies', category: 'Edible', price: 20.00, brand: 'Wyld', image: '', description: 'Hybrid enhanced gummies', effects: ['Balanced'], source: 'scrape' },
  { id: 'mock-5', name: 'Camino Midnight Blueberry', category: 'Edible', price: 22.00, brand: 'Kiva', image: '', description: 'Sleep inducing gummies', effects: ['Sleepy'], source: 'scrape' }
];

export async function searchCannMenusProducts(brandName: string, state: string) {
  await requireUser(['brand', 'owner', 'dispensary']);

  try {
    // 1. Try CannMenus Service (API)
    const cmService = new CannMenusService();
    // Use generic search to find products by brand
    const { products } = await cmService.searchProducts({ brands: brandName, limit: 50 });

    if (products && products.length > 0) {
      return products.map(p => ({
        id: p.cann_sku_id,
        name: p.product_name,
        brand: p.brand_name || brandName,
        category: p.category,
        price: p.latest_price,
        image: p.image_url,
        description: p.description,
        effects: p.effects || [],
        source: 'cannmenus'
      }));
    }

    // 2. Leafly Fallback (Internal Logic / Mock for now as robust scraper isn't directly exposed here yet)
    // We could check 'ingestionRuns' or 'sources/leafly' but for now we skip to mock to ensure responsiveness.
    // Real implementation would query: firestore.collection('sources/leafly/dispensaries/.../products').where('brandName', '==', brandName)...

    // 3. Fallback Scrape/Mock
    const demoResults = MOCK_PRODUCTS.filter(p =>
      p.brand.toLowerCase().includes(brandName.toLowerCase()) ||
      p.name.toLowerCase().includes(brandName.toLowerCase())
    );

    return demoResults.length > 0 ? demoResults : MOCK_PRODUCTS.slice(0, 3);

  } catch (error) {
    logger.error('Error searching CannMenus products:', error instanceof Error ? error : new Error(String(error)));
    return MOCK_PRODUCTS;
  }
}

export async function importProducts(products: any[]) { // Typo fix: any[]
  const user = await requireUser(['brand', 'owner', 'dispensary']);
  const brandId = user.brandId; // Dispensaries might not have this, handled below

  const { firestore } = await createServerClient();

  // Enforce Product Limits for Trial (Brand Only)
  if (user.role === 'brand' && brandId) {
    const orgDoc = await firestore.collection('organizations').doc(brandId).get();
    const billing = orgDoc.data()?.billing;
    const isTrial = billing?.subscriptionStatus === 'trial';

    if (isTrial) {
      const currentProducts = await firestore.collection('products')
        .where('brandId', '==', brandId)
        .get();

      const existingCount = currentProducts.size;
      const MAX_FREE = 3;

      if (existingCount >= MAX_FREE) {
        throw new Error('Limit reached: Trial accounts are limited to 3 products.');
      }

      const remainingSlots = MAX_FREE - existingCount;
      if (products.length > remainingSlots) {
        products = products.slice(0, remainingSlots);
      }
    }
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
      imageUrl: p.image || '',
      imageHint: p.category,
      description: p.description || '',
      brandId: brandId || user.uid, // Dispensaries own their products if no brand org
      source: p.source || 'cannmenus', // Fallback default
      sourceTimestamp: new Date(),
    };

    batch.set(newProductRef, domainProduct);
    importedCount++;
  }

  await batch.commit();
  return { success: true, count: importedCount };
}

export async function deleteProduct(productId: string) {
  const user = await requireUser(['brand', 'owner', 'dispensary']);
  const { firestore } = await createServerClient();

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
  const user = await requireUser(['brand', 'owner', 'dispensary']);
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
    brandId: brandId || user.uid,
    source: 'manual' as const, // Explicit manual source
    sourceTimestamp: new Date(),
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

export async function getBrandStatus() {
  const user = await requireUser(['brand', 'owner']);
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
    max: 3
  };
}
