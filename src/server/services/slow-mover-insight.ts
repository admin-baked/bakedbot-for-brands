import { getAdminFirestore } from '@/firebase/admin';

export interface SlowMoverProduct {
  name: string;
  category: string;
  valueAtRisk: number;
  daysInInventory: number;
  price?: number;
  stockLevel?: number;
}

export interface SlowMoverInsight {
  headline: string;
  totalValueAtRisk: number;
  totalSkus: number;
  topProducts: SlowMoverProduct[];
  categoryBreakdown: Record<string, unknown>;
  dataFreshness: string;
}

function extractSlowMoverTotalSkus(headline: string): number {
  const match = headline.match(/\((\d+)\s+SKUs?\)/i) ?? headline.match(/(\d+)\s+SKUs?/i);
  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoTimestamp(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

/**
 * Load slow-mover inventory insight from the deliberative audit pipeline.
 * Written by InventoryVelocityGenerator into tenants/{orgId}/insights.
 */
export async function loadSlowMoverInsight(orgId: string): Promise<SlowMoverInsight | null> {
  try {
    const db = getAdminFirestore();
    const docId = `${orgId}:velocity:slow_movers`;
    const snap = await db.collection(`tenants/${orgId}/insights`).doc(docId).get();
    if (!snap.exists) return null;

    const data = snap.data() ?? {};
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const headline = String(data.headline ?? '');
    const totalSkus = Number(meta.totalSkus ?? 0) || extractSlowMoverTotalSkus(headline);
    const timestamp =
      toIsoTimestamp(data.updatedAt)
      ?? toIsoTimestamp(data.generatedAt)
      ?? toIsoTimestamp(data.lastUpdated);
    const ageHours = timestamp
      ? Math.round((Date.now() - new Date(timestamp).getTime()) / 3_600_000)
      : null;

    return {
      headline,
      totalValueAtRisk: Number(meta.totalValueAtRisk ?? 0),
      totalSkus,
      topProducts: ((meta.topProducts ?? []) as Array<Record<string, unknown>>).slice(0, 10).map((product) => ({
        name: String(product.name ?? 'Unknown'),
        category: String(product.category ?? ''),
        valueAtRisk: Number(product.valueAtRisk ?? 0),
        daysInInventory: Number(product.daysInInventory ?? 0),
        price: product.price !== undefined ? Number(product.price) : undefined,
        stockLevel: product.stockLevel !== undefined ? Number(product.stockLevel) : undefined,
      })),
      categoryBreakdown: (meta.categoryBreakdown as Record<string, unknown>) ?? {},
      dataFreshness: ageHours !== null
        ? (ageHours < 24 ? 'fresh (< 24h)' : `${Math.floor(ageHours / 24)}d old`)
        : 'unknown',
    };
  } catch {
    return null;
  }
}
