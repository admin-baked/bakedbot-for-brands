import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

interface RawCatalogProduct {
  id: string;
  name?: string | null;
  productName?: string | null;
  category?: string | null;
  price?: unknown;
  originalPrice?: unknown;
  cost?: unknown;
  wholesalePrice?: unknown;
  stock?: unknown;
  stockCount?: unknown;
  salesLast7Days?: unknown;
  salesLast30Days?: unknown;
  salesVelocity?: unknown;
  lastSaleAt?: unknown;
  dynamicPricingApplied?: unknown;
  dynamicPricingUpdatedAt?: unknown;
  dynamicPricingReason?: unknown;
  dynamicPricingBadge?: unknown;
  source?: string;
  externalId?: string | null;
  sku_id?: string | null;
  orgId?: string | null;
  dispensaryId?: string | null;
}

export interface CatalogAnalyticsProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  cost?: number;
  stock: number;
  salesLast7Days: number;
  salesLast30Days: number;
  salesVelocity: number;
  lastSaleAt?: unknown;
  dynamicPricingApplied: boolean;
  dynamicPricingUpdatedAt?: unknown;
  dynamicPricingReason?: string;
  dynamicPricingBadge?: string;
  source?: string;
  externalId?: string;
  skuId?: string;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/[^0-9.-]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toNonNegativeNumber(value: unknown, fallback = 0): number {
  const parsed = toFiniteNumber(value);
  return parsed == null ? fallback : Math.max(parsed, 0);
}

function toOptionalNonNegativeNumber(value: unknown): number | undefined {
  const parsed = toFiniteNumber(value);
  if (parsed == null) return undefined;
  return Math.max(parsed, 0);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

function toText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function toLookupToken(value: unknown): string | undefined {
  const text = toText(value);
  if (!text) return undefined;
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildProductNameKey(name: unknown, category: unknown): string | undefined {
  const normalizedName = toLookupToken(name);
  if (!normalizedName) return undefined;
  const normalizedCategory = toLookupToken(category);
  return normalizedCategory
    ? `name:${normalizedName}|category:${normalizedCategory}`
    : `name:${normalizedName}`;
}

function buildProductLookupKeys(product: Partial<RawCatalogProduct>): string[] {
  const keys = new Set<string>();
  const add = (prefix: string, value: unknown) => {
    const token = toLookupToken(value);
    if (token) {
      keys.add(`${prefix}:${token}`);
    }
  };

  add('id', product.id);
  add('externalId', product.externalId);
  add('sku', product.sku_id);
  const nameKey = buildProductNameKey(product.name ?? product.productName, product.category);
  if (nameKey) {
    keys.add(nameKey);
  }

  return Array.from(keys);
}

function mergeRawProducts(primary: RawCatalogProduct, secondary: RawCatalogProduct): RawCatalogProduct {
  return {
    ...secondary,
    ...primary,
    id: primary.id || secondary.id,
    name: primary.name ?? primary.productName ?? secondary.name ?? secondary.productName,
    productName: primary.productName ?? primary.name ?? secondary.productName ?? secondary.name,
    category: primary.category ?? secondary.category,
    price: primary.price ?? primary.originalPrice ?? secondary.price ?? secondary.originalPrice,
    originalPrice: primary.originalPrice ?? primary.price ?? secondary.originalPrice ?? secondary.price,
    cost: primary.cost ?? primary.wholesalePrice ?? secondary.cost ?? secondary.wholesalePrice,
    wholesalePrice: primary.wholesalePrice ?? primary.cost ?? secondary.wholesalePrice ?? secondary.cost,
    stock: primary.stock ?? primary.stockCount ?? secondary.stock ?? secondary.stockCount,
    stockCount: primary.stockCount ?? primary.stock ?? secondary.stockCount ?? secondary.stock,
    salesLast7Days: primary.salesLast7Days ?? secondary.salesLast7Days,
    salesLast30Days: primary.salesLast30Days ?? secondary.salesLast30Days,
    salesVelocity: primary.salesVelocity ?? secondary.salesVelocity,
    lastSaleAt: primary.lastSaleAt ?? secondary.lastSaleAt,
    dynamicPricingApplied: primary.dynamicPricingApplied ?? secondary.dynamicPricingApplied,
    dynamicPricingUpdatedAt: primary.dynamicPricingUpdatedAt ?? secondary.dynamicPricingUpdatedAt,
    dynamicPricingReason: primary.dynamicPricingReason ?? secondary.dynamicPricingReason,
    dynamicPricingBadge: primary.dynamicPricingBadge ?? secondary.dynamicPricingBadge,
    source: primary.source ?? secondary.source,
    externalId: primary.externalId ?? secondary.externalId,
    sku_id: primary.sku_id ?? secondary.sku_id,
    orgId: primary.orgId ?? secondary.orgId,
    dispensaryId: primary.dispensaryId ?? secondary.dispensaryId,
  };
}

function normalizeProduct(product: RawCatalogProduct): CatalogAnalyticsProduct {
  const salesLast7Days = toNonNegativeNumber(product.salesLast7Days);
  const salesLast30Days = toNonNegativeNumber(product.salesLast30Days);
  const derivedVelocity = salesLast7Days > 0
    ? salesLast7Days / 7
    : salesLast30Days > 0
      ? salesLast30Days / 30
      : 0;

  return {
    id: product.id,
    name: toText(product.name ?? product.productName) ?? 'Unknown Product',
    category: toText(product.category) ?? 'Other',
    price: toNonNegativeNumber(product.price ?? product.originalPrice),
    originalPrice: toOptionalNonNegativeNumber(product.originalPrice),
    cost: toOptionalNonNegativeNumber(product.cost ?? product.wholesalePrice),
    stock: toNonNegativeNumber(product.stock ?? product.stockCount),
    salesLast7Days,
    salesLast30Days,
    salesVelocity: toNonNegativeNumber(product.salesVelocity, derivedVelocity),
    lastSaleAt: product.lastSaleAt,
    dynamicPricingApplied: toBoolean(product.dynamicPricingApplied),
    dynamicPricingUpdatedAt: product.dynamicPricingUpdatedAt,
    dynamicPricingReason: toText(product.dynamicPricingReason),
    dynamicPricingBadge: toText(product.dynamicPricingBadge),
    source: toText(product.source),
    externalId: toText(product.externalId),
    skuId: toText(product.sku_id),
  };
}

async function queryRawProducts(
  field: 'orgId' | 'dispensaryId',
  orgId: string,
): Promise<RawCatalogProduct[]> {
  const db = getAdminFirestore();

  try {
    const snap = await db.collection('products')
      .where(field, '==', orgId)
      .limit(500)
      .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RawCatalogProduct));
  } catch (error) {
    logger.warn('[catalog-analytics-source] Product query failed', {
      orgId,
      field,
      error: String(error),
    });
    return [];
  }
}

export async function loadCatalogAnalyticsProducts(orgId: string): Promise<CatalogAnalyticsProduct[]> {
  const db = getAdminFirestore();
  const [tenantSnap, rootByOrg, rootByDispensary] = await Promise.all([
    db.collection('tenants').doc(orgId)
      .collection('publicViews').doc('products')
      .collection('items')
      .limit(500)
      .get()
      .catch((error) => {
        logger.warn('[catalog-analytics-source] Tenant product catalog query failed', {
          orgId,
          error: String(error),
        });
        return null;
      }),
    queryRawProducts('orgId', orgId),
    queryRawProducts('dispensaryId', orgId),
  ]);

  const tenantProducts = tenantSnap?.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RawCatalogProduct)) ?? [];
  const mergedProducts = new Map<string, RawCatalogProduct>();
  const lookupToCanonicalId = new Map<string, string>();

  const registerProduct = (product: RawCatalogProduct) => {
    mergedProducts.set(product.id, product);
    for (const key of buildProductLookupKeys(product)) {
      lookupToCanonicalId.set(key, product.id);
    }
  };

  for (const product of tenantProducts) {
    registerProduct(product);
  }

  for (const rawProduct of [...rootByOrg, ...rootByDispensary]) {
    const existingId = buildProductLookupKeys(rawProduct)
      .map((key) => lookupToCanonicalId.get(key))
      .find((value): value is string => typeof value === 'string');

    if (!existingId) {
      registerProduct(rawProduct);
      continue;
    }

    const existing = mergedProducts.get(existingId);
    if (!existing) {
      registerProduct(rawProduct);
      continue;
    }

    const merged = mergeRawProducts(existing, rawProduct);
    mergedProducts.set(existingId, merged);
    for (const key of buildProductLookupKeys(merged)) {
      lookupToCanonicalId.set(key, existingId);
    }
  }

  if (mergedProducts.size === 0) {
    logger.info('[catalog-analytics-source] No products found for analytics', { orgId });
    return [];
  }

  logger.info('[catalog-analytics-source] Loaded products for analytics', {
    orgId,
    tenantCatalogCount: tenantProducts.length,
    rootOrgCount: rootByOrg.length,
    rootDispensaryCount: rootByDispensary.length,
    mergedCount: mergedProducts.size,
  });

  return Array.from(mergedProducts.values()).map(normalizeProduct);
}

export function toAnalyticsDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
    if ('_seconds' in (value as object) && typeof (value as { _seconds?: unknown })._seconds === 'number') {
      return new Date((value as { _seconds: number })._seconds * 1000);
    }
    if ('seconds' in (value as object) && typeof (value as { seconds?: unknown }).seconds === 'number') {
      return new Date((value as { seconds: number }).seconds * 1000);
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}
