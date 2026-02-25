'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BudtenderProduct {
  id: string;
  name: string;
  brandName: string;
  category: string;
  strainType?: string;
  thcPercent?: number;
  cbdPercent?: number;
  price: number;
  weight?: number;
  weightUnit?: string;
  description?: string;
  effects?: string[];
  terpenes?: { name: string; percent: number }[];
  imageUrl?: string;
  inStock: boolean;
}

export interface BudtenderGuideData {
  orgName: string;
  generatedAt: string;
  totalProducts: number;
  inStockCount: number;
  productsByCategory: Record<string, BudtenderProduct[]>;
  categories: string[];
}

// ─── Effects inference ────────────────────────────────────────────────────────

const STRAIN_EFFECTS: Record<string, string[]> = {
  Sativa: ['Energetic', 'Creative', 'Uplifting', 'Focus'],
  Indica: ['Relaxing', 'Sleepy', 'Body High', 'Calm'],
  Hybrid: ['Balanced', 'Euphoric', 'Relaxing', 'Creative'],
  CBD: ['Calm', 'Clear-headed', 'Wellness', 'Non-psychoactive'],
};

function inferEffects(product: { effects?: string[]; strainType?: string }): string[] {
  if (product.effects && product.effects.length > 0) return product.effects.slice(0, 4);
  if (product.strainType && STRAIN_EFFECTS[product.strainType]) {
    return STRAIN_EFFECTS[product.strainType];
  }
  return [];
}

// ─── Category ordering ────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  'Flower', 'Pre-Roll', 'Vape', 'Concentrate', 'Edible',
  'Tincture', 'Topical', 'Accessory', 'Other',
];

function sortCategories(categories: string[]): string[] {
  return categories.sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex(c => a.toLowerCase().includes(c.toLowerCase()));
    const bi = CATEGORY_ORDER.findIndex(c => b.toLowerCase().includes(c.toLowerCase()));
    const aIdx = ai === -1 ? 99 : ai;
    const bIdx = bi === -1 ? 99 : bi;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b);
  });
}

// ─── Server action ────────────────────────────────────────────────────────────

export async function getBudtenderGuideData(): Promise<BudtenderGuideData> {
  const user = await requireUser([
    'dispensary', 'dispensary_admin', 'dispensary_staff',
    'brand', 'brand_admin', 'super_user',
  ]);

  const orgId = (user as any).orgId || (user as any).currentOrgId;
  if (!orgId) throw new Error('No organization found');

  const db = getAdminFirestore();

  // Fetch all products from tenant catalog
  const itemsRef = db
    .collection('tenants').doc(orgId)
    .collection('publicViews').doc('products')
    .collection('items');

  const snap = await itemsRef.orderBy('category').orderBy('name').get();

  const products: BudtenderProduct[] = snap.docs.map(doc => {
    const d = doc.data();
    const raw: BudtenderProduct = {
      id: doc.id,
      name: d.name || d.product_name || '',
      brandName: d.brandName || d.brand_name || '',
      category: d.category || 'Other',
      strainType: d.strainType || undefined,
      thcPercent: d.thcPercent ?? d.percentage_thc ?? undefined,
      cbdPercent: d.cbdPercent ?? d.percentage_cbd ?? undefined,
      price: d.price ?? d.latest_price ?? 0,
      weight: d.weight ?? undefined,
      weightUnit: d.weightUnit ?? undefined,
      description: d.description ?? undefined,
      effects: d.effects ?? undefined,
      terpenes: d.terpenes ?? undefined,
      imageUrl: d.imageUrl ?? undefined,
      inStock: d.inStock !== false,
    };
    // Enrich effects if missing
    raw.effects = inferEffects(raw);
    return raw;
  });

  // Group by category
  const productsByCategory: Record<string, BudtenderProduct[]> = {};
  for (const p of products) {
    if (!productsByCategory[p.category]) productsByCategory[p.category] = [];
    productsByCategory[p.category].push(p);
  }

  const categories = sortCategories(Object.keys(productsByCategory));

  // Get org name
  let orgName = 'Your Dispensary';
  try {
    const orgDoc = await db.collection('organizations').doc(orgId).get();
    if (orgDoc.exists) {
      orgName = orgDoc.data()?.name || orgDoc.data()?.displayName || orgName;
    }
  } catch (err) {
    logger.warn('[BudtenderGuide] Could not fetch org name', { orgId, err });
  }

  const inStockCount = products.filter(p => p.inStock).length;

  logger.info('[BudtenderGuide] Generated guide', {
    orgId,
    total: products.length,
    inStock: inStockCount,
    categories: categories.length,
  });

  return {
    orgName,
    generatedAt: new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
    totalProducts: products.length,
    inStockCount,
    productsByCategory,
    categories,
  };
}
