/**
 * Cloud Function: Backfill Sales Analytics
 *
 * Backfills historical sales data from orders collection into product metrics.
 *
 * Triggered by: HTTP POST with orgId and days query parameters
 * Example: https://us-central1-studio-567050101-bc6e8.cloudfunctions.net/backfillSalesAnalytics?orgId=org_thrive_syracuse&days=90
 */

import * as functions from 'firebase-functions/v2';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin (uses Application Default Credentials in Cloud environment)
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export const backfillSalesAnalytics = functions.https.onRequest(
  async (request, response) => {
    const { orgId, days } = request.query;

    // Validate inputs
    if (!orgId) {
      return response.status(400).json({
        success: false,
        error: 'orgId query parameter required',
        example: '?orgId=org_thrive_syracuse&days=90',
      });
    }

    const lookbackDays = parseInt(days || 90, 10);
    if (isNaN(lookbackDays) || lookbackDays < 1) {
      return response.status(400).json({
        success: false,
        error: 'days must be a positive integer',
      });
    }

    try {
      console.log(`[Backfill] Starting sales analytics backfill for ${orgId}`);
      console.log(`[Backfill] Lookback period: ${lookbackDays} days`);

      // Calculate date range
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);
      console.log(`[Backfill] Querying orders since ${lookbackDate.toISOString()}...`);

      // Query orders for this org within lookback period
      const ordersSnapshot = await db
        .collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(lookbackDate))
        .get();

      console.log(`[Backfill] Found ${ordersSnapshot.docs.length} orders`);

      // Aggregate sales by product
      const salesData = {};
      for (const orderDoc of ordersSnapshot.docs) {
        const order = orderDoc.data();
        const items = order.items || [];

        for (const item of items) {
          const productId = item.productId || item.id;
          if (!productId) continue;

          if (!salesData[productId]) {
            salesData[productId] = {
              count: 0,
              sales: [],
            };
          }

          const qty = item.quantity || item.qty || 1;
          const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);

          salesData[productId].count += qty;
          salesData[productId].sales.push({
            date: createdAt,
            qty,
          });
        }
      }

      const uniqueProducts = Object.keys(salesData).length;
      console.log(`[Backfill] Aggregated sales for ${uniqueProducts} unique products`);

      // Update products with sales metrics
      let updatedCount = 0;
      const batch = db.batch();

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      for (const [productId, data] of Object.entries(salesData)) {
        const productRef = db.collection(`tenants/${orgId}/products`).doc(productId);

        // Calculate 7-day sales
        const salesLast7Days = data.sales.filter(s => s.date >= sevenDaysAgo).reduce((sum, s) => sum + s.qty, 0);
        const salesLast7DaysCount = data.sales.filter(s => s.date >= sevenDaysAgo).length;

        // Calculate velocity
        const salesVelocity = salesLast7DaysCount > 0 ? salesLast7Days / 7 : 0;

        // Determine trending
        const lastSale = data.sales.length > 0 ? data.sales.sort((a, b) => b.date.getTime() - a.date.getTime())[0] : null;
        const lastSaleAt = lastSale ? lastSale.date : null;
        const isRecent = lastSaleAt ? lastSaleAt >= sevenDaysAgo : false;
        const isTrending = salesVelocity > 2 && isRecent;

        batch.update(productRef, {
          salesCount: data.count,
          salesLast7Days,
          salesVelocity,
          lastSaleAt: lastSaleAt ? Timestamp.fromDate(lastSaleAt) : null,
          trending: isTrending,
          updatedAt: Timestamp.now(),
        });

        updatedCount++;
      }

      await batch.commit();
      console.log(`[Backfill] Updated ${updatedCount} products`);

      return response.json({
        success: true,
        message: 'Backfill completed successfully',
        results: {
          ordersProcessed: ordersSnapshot.docs.length,
          productsUpdated: updatedCount,
          lookbackDays,
          dateRange: {
            from: lookbackDate.toISOString(),
            to: now.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('[Backfill] Error:', error);
      return response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
