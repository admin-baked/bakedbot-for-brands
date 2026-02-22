'use server';

/**
 * Server Action: Cleanup Orphaned Products
 *
 * Removes products from Firestore that are NOT in Alleaves POS.
 * This runs within the authenticated Next.js context.
 *
 * Safety checks:
 * - Only deletes products with source != 'pos'
 * - Preserves quarantined products
 * - Requires superuser auth
 * - Returns full audit trail
 */

import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

interface CleanupStats {
  timestamp: string;
  orgId: string;
  mode: 'audit' | 'execute';
  before: number;
  posProducts: number;
  quarantinedProducts: number;
  orphaned: number;
  orphanedBySource: Record<string, number>;
  deleted: number;
  after: number;
  expected: number;
  success: boolean;
  errors: string[];
}

/**
 * Audit orphaned products (read-only)
 */
export async function auditOrphanedProducts(
  orgId: string
): Promise<CleanupStats> {
  await requireSuperUser();

  const db = getAdminFirestore();
  const stats: CleanupStats = {
    timestamp: new Date().toISOString(),
    orgId,
    mode: 'audit',
    before: 0,
    posProducts: 0,
    quarantinedProducts: 0,
    orphaned: 0,
    orphanedBySource: {},
    deleted: 0,
    after: 0,
    expected: 331, // 328 POS + 3 quarantine
    success: false,
    errors: [],
  };

  try {
    // Get all products for this org
    const allProducts = await db
      .collection('products')
      .where('orgId', '==', orgId)
      .get();

    stats.before = allProducts.size;

    // Categorize
    allProducts.forEach(doc => {
      const product = doc.data();
      const status = product.status || 'active';
      const source = product.source || 'unknown';

      if (status === 'quarantine') {
        stats.quarantinedProducts++;
      } else if (source === 'pos') {
        stats.posProducts++;
      } else {
        stats.orphaned++;
        stats.orphanedBySource[source] = (stats.orphanedBySource[source] || 0) + 1;
      }
    });

    stats.after = stats.posProducts + stats.quarantinedProducts;
    stats.success = stats.after === stats.expected;

    logger.info('Product audit complete', {
      orgId,
      before: stats.before,
      posProducts: stats.posProducts,
      quarantined: stats.quarantinedProducts,
      orphaned: stats.orphaned,
      orphanedBySource: stats.orphanedBySource,
    });

    return stats;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Audit failed: ${message}`);
    logger.error('Product audit failed', { orgId, error: message });
    throw error;
  }
}

/**
 * Execute cleanup of orphaned products
 *
 * WARNING: This DELETES products. Cannot be undone without Firestore restore.
 */
export async function executeProductCleanup(
  orgId: string
): Promise<CleanupStats> {
  await requireSuperUser();

  const db = getAdminFirestore();
  const stats: CleanupStats = {
    timestamp: new Date().toISOString(),
    orgId,
    mode: 'execute',
    before: 0,
    posProducts: 0,
    quarantinedProducts: 0,
    orphaned: 0,
    orphanedBySource: {},
    deleted: 0,
    after: 0,
    expected: 331, // 328 POS + 3 quarantine
    success: false,
    errors: [],
  };

  try {
    logger.warn('Product cleanup execution started', { orgId });

    // Get all products
    const allProducts = await db
      .collection('products')
      .where('orgId', '==', orgId)
      .get();

    stats.before = allProducts.size;

    const orphanedDocs: FirebaseFirestore.DocumentReference[] = [];

    // Identify orphaned products
    allProducts.forEach(doc => {
      const product = doc.data();
      const status = product.status || 'active';
      const source = product.source || 'unknown';

      if (status === 'quarantine') {
        stats.quarantinedProducts++;
      } else if (source === 'pos') {
        stats.posProducts++;
      } else {
        stats.orphaned++;
        stats.orphanedBySource[source] = (stats.orphanedBySource[source] || 0) + 1;
        orphanedDocs.push(doc.ref);
      }
    });

    logger.info('Identified orphaned products', {
      orgId,
      count: orphanedDocs.length,
      bySource: stats.orphanedBySource,
    });

    // Delete in batches
    const batchSize = 100;
    for (let i = 0; i < orphanedDocs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = orphanedDocs.slice(i, i + batchSize);

      batchDocs.forEach(docRef => {
        batch.delete(docRef);
      });

      try {
        await batch.commit();
        stats.deleted += batchDocs.length;
        logger.info('Deleted batch', {
          orgId,
          batchNum: Math.floor(i / batchSize) + 1,
          count: batchDocs.length,
        });
      } catch (batchError) {
        const batchMsg =
          batchError instanceof Error ? batchError.message : String(batchError);
        stats.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${batchMsg}`);
        logger.error('Batch delete failed', {
          orgId,
          batchNum: Math.floor(i / batchSize) + 1,
          error: batchMsg,
        });
      }
    }

    // Verify final count
    const finalSnapshot = await db
      .collection('products')
      .where('orgId', '==', orgId)
      .get();

    stats.after = finalSnapshot.size;
    stats.success = stats.after === stats.expected && stats.errors.length === 0;

    logger.info('Product cleanup completed', {
      orgId,
      deleted: stats.deleted,
      before: stats.before,
      after: stats.after,
      expected: stats.expected,
      success: stats.success,
    });

    return stats;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Cleanup failed: ${message}`);
    logger.error('Product cleanup failed', { orgId, error: message });
    throw error;
  }
}
