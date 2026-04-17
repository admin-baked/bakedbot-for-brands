#!/usr/bin/env tsx
import { FieldValue } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { getAdminFirestore } from '../src/firebase/admin';
import {
  loadCatalogAnalyticsProducts,
  toAnalyticsDate,
} from '../src/server/services/catalog-analytics-source';
import {
  buildSlowMoverAudit,
  getSlowMoverThresholdsFromBenchmarks,
} from '../src/server/services/slow-mover-audit';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DEFAULT_THRESHOLDS = getSlowMoverThresholdsFromBenchmarks(null, {
  actionDays: 60,
  liquidateDays: 90,
  maxVelocityUnitsPerDay: 0.1,
});

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const orgId = args.find((arg) => !arg.startsWith('--')) || 'org_thrive_syracuse';

  const db = getAdminFirestore();
  const now = new Date();
  const products = await loadCatalogAnalyticsProducts(orgId);
  const slowMoverAudit = buildSlowMoverAudit(products, DEFAULT_THRESHOLDS, { now });
  const slowMovers = slowMoverAudit.items;
  const productsWithStock = products.filter((product) => product.stock > 0);
  const productsWithLastSale = products.filter((product) => !!toAnalyticsDate(product.lastSaleAt));
  const productsPastActionWindow = products.filter((product) => {
    const lastSaleAt = toAnalyticsDate(product.lastSaleAt);
    if (!lastSaleAt) return false;
    return Math.floor((now.getTime() - lastSaleAt.getTime()) / 86_400_000) >= DEFAULT_THRESHOLDS.actionDays;
  });
  const missingSalesHistory = productsWithStock.length > 0 && productsWithLastSale.length === 0;

  const byCategory = new Map<string, { count: number; stock: number; value: number }>();
  for (const product of slowMovers) {
    const category = product.category || 'Other';
    const existing = byCategory.get(category) ?? { count: 0, stock: 0, value: 0 };
    existing.count += 1;
    existing.stock += product.stockLevel;
    existing.value += product.estimatedAtRisk;
    byCategory.set(category, existing);
  }

  const topProducts = slowMovers.slice(0, 5).map((product) => ({
    productId: product.productId,
    name: product.name,
    category: product.category,
    price: product.price,
    stockLevel: product.stockLevel,
    daysInInventory: product.daysSinceLastSale,
    valueAtRisk: product.estimatedAtRisk,
  }));

  const totalValueAtRisk = slowMovers.reduce((sum, product) => sum + product.estimatedAtRisk, 0);
  const headline = totalValueAtRisk > 0
    ? `$${Math.round(totalValueAtRisk).toLocaleString()} in slow-moving inventory (${slowMovers.length} SKUs)`
    : missingSalesHistory
      ? `Sales history missing for ${productsWithStock.length} in-stock SKUs`
      : `${slowMovers.length} slow-moving products`;
  const subtext = missingSalesHistory
    ? 'Catalog is loading, but no products have last-sale telemetry yet, so slow-mover flags stay paused until sales history syncs.'
    : '';

  const payload = {
    id: `${orgId}:velocity:slow_movers`,
    orgId,
    category: 'velocity',
    agentId: 'money_mike',
    agentName: 'Money Mike',
    title: 'SLOW MOVERS',
    tooltipText: 'Products with 60+ days since last sale and near-zero velocity, grouped by category to prioritize markdowns or liquidation.',
    headline,
    subtext,
    value: missingSalesHistory ? productsWithStock.length : slowMovers.length,
    unit: 'products',
    severity: missingSalesHistory
      ? 'warning'
      : totalValueAtRisk > 5000
        ? 'warning'
        : slowMovers.length > 20
          ? 'warning'
          : 'info',
    actionable: true,
    ctaLabel: topProducts.length > 0
      ? 'Review & Discount'
      : missingSalesHistory
        ? 'Review Catalog Sync'
        : 'Create Bundle or Discount',
    threadType: 'inventory_promo',
    threadPrompt: topProducts.length > 0
      ? `I have $${Math.round(totalValueAtRisk).toLocaleString()} in slow-moving inventory across ${slowMovers.length} SKUs. Help me prioritize markdowns or liquidation.`
      : missingSalesHistory
        ? `I loaded ${products.length} catalog products for ${orgId}, but ${productsWithStock.length} in-stock SKUs still have no last-sale telemetry. Help me validate or backfill sales history before I apply markdowns.`
        : `I have ${slowMovers.length} slow-moving products taking up inventory. Help me create bundles or apply discounts to move them faster.`,
    dataSource: 'Inventory age + catalog (Alleaves)',
    lastUpdated: now,
    generatedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    metadata: {
      totalSkus: slowMovers.length,
      categoryBreakdown: Object.fromEntries(byCategory),
      topProducts,
      totalValueAtRisk,
      skippedMissingLastSale: slowMoverAudit.skippedMissingLastSale,
      productsWithStock: productsWithStock.length,
      productsWithLastSale: productsWithLastSale.length,
      actionDays: DEFAULT_THRESHOLDS.actionDays,
      liquidateDays: DEFAULT_THRESHOLDS.liquidateDays,
    },
  };

  console.log(JSON.stringify({
    orgId,
    productsLoaded: products.length,
    productsWithStock: productsWithStock.length,
    productsWithLastSale: productsWithLastSale.length,
    productsPastActionWindow: productsPastActionWindow.length,
    slowMoverCount: slowMovers.length,
    skippedMissingLastSale: slowMoverAudit.skippedMissingLastSale,
    headline,
    subtext,
    topProducts,
    sampleProducts: products.slice(0, 5).map((product) => ({
      id: product.id,
      name: product.name,
      stock: product.stock,
      salesVelocity: product.salesVelocity,
      lastSaleAt: toAnalyticsDate(product.lastSaleAt)?.toISOString() ?? null,
    })),
    apply,
  }, null, 2));

  if (!apply) {
    return;
  }

  await db.collection('tenants').doc(orgId).collection('insights').doc(payload.id).set(payload, { merge: true });
  console.log(`Slow-mover insight updated for ${orgId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
