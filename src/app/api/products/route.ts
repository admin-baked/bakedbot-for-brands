import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';
import { logger } from '@/lib/logger';

/**
 * Get products for an organization
 *
 * Caching strategy:
 * - 5 min TTL (balances freshness vs performance)
 * - Invalidated on POS sync (see src/server/services/pos-sync.ts)
 * - Invalidated on manual product updates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Fetch products with caching (5 min TTL)
    const products = await withCache(
      CachePrefix.PRODUCTS,
      orgId,
      async () => {
        const db = getAdminFirestore();

        // Fetch products from tenant's public view
        const productsSnapshot = await db
          .collection('tenants')
          .doc(orgId)
          .collection('publicViews')
          .doc('products')
          .collection('items')
          .limit(500)
          .get();

        return productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      },
      CacheTTL.PRODUCTS
    );

    return NextResponse.json({ success: true, products });
  } catch (error) {
    logger.error('Failed to fetch products', { error, orgId: request.nextUrl.searchParams.get('orgId') });
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
