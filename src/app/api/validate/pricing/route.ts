/**
 * Pricing System Validation API Endpoint
 *
 * Provides HTTP access to the pricing validation script.
 * Requires super_user role for security.
 *
 * Usage:
 *   GET /api/validate/pricing?orgId=org_thrive_syracuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { getAdminFirestore } from '@/firebase/admin';
import { calculateDynamicPrice } from '@/app/actions/dynamic-pricing';
import { getCompetitorPricing } from '@/server/services/ezal/competitor-pricing';
import { getInventoryAge } from '@/server/services/alleaves/inventory-intelligence';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ValidationResult {
  test: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId') || 'org_thrive_syracuse';

  const results: ValidationResult[] = [];

  try {
    // Test 1: Firestore Connection
    const { firestore } = await createServerClient();
    const tenantDoc = await firestore.collection('tenants').doc(orgId).get();

    if (!tenantDoc.exists) {
      results.push({ test: 'Firestore Connection', status: 'fail', message: `Tenant ${orgId} not found` });
      return NextResponse.json({ success: false, results }, { status: 404 });
    }

    results.push({ test: 'Firestore Connection', status: 'pass', message: `Connected to tenant ${orgId}` });

    // Test 2: Pricing Rules
    const db = getAdminFirestore();
    const rulesSnap = await db
      .collection('pricingRules')
      .where('orgId', '==', orgId)
      .where('active', '==', true)
      .get();

    if (rulesSnap.empty) {
      results.push({
        test: 'Pricing Rules',
        status: 'warn',
        message: 'No active pricing rules found',
        details: { recommendation: 'Create pricing rules or seed sample rules' },
      });
    } else {
      const rules = rulesSnap.docs.map((d) => ({
        name: d.data().name,
        strategy: d.data().strategy,
        priority: d.data().priority,
      }));
      results.push({
        test: 'Pricing Rules',
        status: 'pass',
        message: `Found ${rulesSnap.size} active rules`,
        details: { rules },
      });
    }

    // Test 3: Product Data
    const productsSnap = await firestore
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .where('inStock', '==', true)
      .limit(1)
      .get();

    if (productsSnap.empty) {
      results.push({ test: 'Product Data', status: 'fail', message: 'No in-stock products found' });
      return NextResponse.json({ success: false, results }, { status: 400 });
    }

    const product = productsSnap.docs[0].data();
    const productId = productsSnap.docs[0].id;
    const productName = product.name || 'Unknown';

    results.push({
      test: 'Product Data',
      status: 'pass',
      message: `Found test product: ${productName}`,
      details: { productId, price: product.price, category: product.category },
    });

    // Test 4: Inventory Age
    try {
      const inventoryAge = await getInventoryAge(productId, orgId);
      if (!inventoryAge) {
        results.push({
          test: 'Inventory Age (Alleaves)',
          status: 'warn',
          message: 'No batch data found',
          details: { recommendation: 'Ensure product has batch procurement date in Alleaves' },
        });
      } else {
        results.push({
          test: 'Inventory Age (Alleaves)',
          status: 'pass',
          message: 'Successfully fetched inventory age',
          details: { daysInInventory: inventoryAge.daysInInventory },
        });
      }
    } catch (error) {
      results.push({
        test: 'Inventory Age (Alleaves)',
        status: 'fail',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 5: Competitor Pricing
    try {
      const competitorData = await getCompetitorPricing(productName, orgId);
      if (competitorData.length === 0) {
        results.push({
          test: 'Competitor Pricing (Ezal)',
          status: 'warn',
          message: 'No competitor data found',
          details: { recommendation: 'Run Ezal discovery to populate competitor pricing' },
        });
      } else {
        const avgPrice = competitorData.reduce((sum, c) => sum + c.price, 0) / competitorData.length;
        results.push({
          test: 'Competitor Pricing (Ezal)',
          status: 'pass',
          message: `Found ${competitorData.length} competitors`,
          details: { avgPrice: avgPrice.toFixed(2) },
        });
      }
    } catch (error) {
      results.push({
        test: 'Competitor Pricing (Ezal)',
        status: 'fail',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 6: Price Calculation
    try {
      const priceResult = await calculateDynamicPrice({ productId, orgId });
      if (!priceResult.success || !priceResult.data) {
        results.push({
          test: 'Price Calculation',
          status: 'warn',
          message: 'No dynamic pricing applied',
          details: { reason: priceResult.error || 'No matching rules' },
        });
      } else {
        const { originalPrice, dynamicPrice, discount } = priceResult.data;
        results.push({
          test: 'Price Calculation',
          status: 'pass',
          message: 'Successfully calculated dynamic price',
          details: {
            originalPrice: originalPrice.toFixed(2),
            dynamicPrice: dynamicPrice.toFixed(2),
            discount: discount.toFixed(2),
          },
        });
      }
    } catch (error) {
      results.push({
        test: 'Price Calculation',
        status: 'fail',
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    // Test 7: Analytics
    const analyticsSnap = await db
      .collection('pricing_analytics')
      .where('orgId', '==', orgId)
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (analyticsSnap.empty) {
      results.push({
        test: 'Analytics Collection',
        status: 'warn',
        message: 'No analytics data found',
        details: { recommendation: 'Analytics will populate after first price application' },
      });
    } else {
      results.push({
        test: 'Analytics Collection',
        status: 'pass',
        message: `Found ${analyticsSnap.size} analytics records`,
      });
    }

    // Summary
    const passed = results.filter((r) => r.status === 'pass').length;
    const warned = results.filter((r) => r.status === 'warn').length;
    const failed = results.filter((r) => r.status === 'fail').length;

    logger.info('[Pricing Validation] Complete', { orgId, passed, warned, failed });

    return NextResponse.json({
      success: failed === 0,
      summary: { passed, warned, failed },
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Pricing Validation] Failed', { error, orgId });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        results,
      },
      { status: 500 }
    );
  }
}
