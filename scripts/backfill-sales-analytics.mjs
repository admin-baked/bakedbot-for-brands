#!/usr/bin/env node

/**
 * Backfill Historical Sales Analytics
 *
 * Backfills salesCount and related metrics from existing orders in Firestore.
 * This is a one-time operation to populate initial sales data for trending calculations.
 *
 * Usage:
 *   node scripts/backfill-sales-analytics.mjs [orgId] [lookbackDays]
 *
 * Examples:
 *   node scripts/backfill-sales-analytics.mjs org_thrive_syracuse 90
 *   node scripts/backfill-sales-analytics.mjs org_thrive_syracuse 365
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const [, , orgId, lookbackDaysArg] = process.argv;
const lookbackDays = parseInt(lookbackDaysArg || '90', 10);

if (!orgId) {
    console.error('Usage: node backfill-sales-analytics.mjs <orgId> [lookbackDays]');
    console.error('Example: node backfill-sales-analytics.mjs org_thrive_syracuse 90');
    process.exit(1);
}

// Initialize Firebase Admin
const serviceAccountPath = path.resolve('.secrets/serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`\n❌ Service account key not found at ${serviceAccountPath}`);
    console.error('\nTo run this script, you need:');
    console.error('1. Download service account key from Firebase Console');
    console.error('2. Save to: .secrets/serviceAccountKey.json');
    console.error('3. Add .secrets/ to .gitignore (already done)');
    console.error('\nFor production deployment via Cloud Scheduler:');
    console.error('1. Create Cloud Task or Cloud Function');
    console.error('2. Use Application Default Credentials (ADC)');
    console.error('3. Run: gcloud functions deploy backfill-sales ...');
    console.error('\nOr run locally with Firebase emulator:');
    console.error('firebase emulators:start --import=/path/to/data\n');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

console.log(`[Backfill] Starting sales analytics backfill for ${orgId}`);
console.log(`[Backfill] Lookback period: ${lookbackDays} days`);

async function backfillSalesAnalytics() {
    try {
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

        console.log(`[Backfill] Querying orders since ${lookbackDate.toISOString()}`);

        // Query orders for this org
        const ordersQuery = db.collection('orders')
            .where('orgId', '==', orgId)
            .where('createdAt', '>=', Timestamp.fromDate(lookbackDate));

        const ordersSnapshot = await ordersQuery.get();
        console.log(`[Backfill] Found ${ordersSnapshot.size} orders`);

        const productSales = {};
        let processedOrders = 0;

        // Aggregate sales from orders
        for (const orderDoc of ordersSnapshot.docs) {
            const order = orderDoc.data();
            processedOrders++;

            if (order.items && Array.isArray(order.items)) {
                for (const item of order.items) {
                    const productId = item.productId;
                    const quantity = item.quantity || 1;

                    if (!productSales[productId]) {
                        productSales[productId] = {
                            count: 0,
                            lastDate: null,
                            dates: [],
                        };
                    }

                    productSales[productId].count += quantity;

                    // Track individual purchase dates for velocity calculation
                    const itemDate = item.purchasedAt ? new Date(item.purchasedAt) : new Date(order.createdAt.toDate());
                    productSales[productId].dates.push(itemDate);

                    if (!productSales[productId].lastDate || itemDate > productSales[productId].lastDate) {
                        productSales[productId].lastDate = itemDate;
                    }
                }
            }

            if (processedOrders % 100 === 0) {
                console.log(`[Backfill] Processed ${processedOrders} orders...`);
            }
        }

        console.log(`[Backfill] Aggregated sales for ${Object.keys(productSales).length} unique products`);

        // Update products with sales data
        let updatedCount = 0;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        for (const [productId, salesData] of Object.entries(productSales)) {
            try {
                const productRef = db.collection('products').doc(productId);
                const productDoc = await productRef.get();

                if (productDoc.exists) {
                    const product = productDoc.data();

                    // Calculate metrics
                    const newSalesCount = Math.max(product.salesCount || 0, salesData.count);

                    // Calculate 7-day and 30-day sales
                    const sevenDaySales = salesData.dates.filter(d => d > sevenDaysAgo).length;
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const thirtyDaySales = salesData.dates.filter(d => d > thirtyDaysAgo).length;

                    // Calculate velocity (units per day over 7-day average)
                    const velocity = sevenDaySales / 7;

                    // Determine trending
                    const isTrending = velocity > 2 && salesData.lastDate && salesData.lastDate > sevenDaysAgo;

                    // Update product
                    await productRef.update({
                        salesCount: newSalesCount,
                        salesLast7Days: sevenDaySales,
                        salesLast30Days: thirtyDaySales,
                        salesVelocity: velocity,
                        lastSaleAt: Timestamp.fromDate(salesData.lastDate),
                        trending: isTrending,
                        updatedAt: Timestamp.fromDate(now),
                    });

                    updatedCount++;

                    if (updatedCount % 100 === 0) {
                        console.log(`[Backfill] Updated ${updatedCount} products...`);
                    }
                }
            } catch (error) {
                console.error(`[Backfill] Error updating product ${productId}:`, error.message);
            }
        }

        console.log(`[Backfill] Successfully updated ${updatedCount} products`);
        console.log(`[Backfill] Backfill completed successfully!`);
        console.log(`[Backfill] Total orders processed: ${processedOrders}`);
        console.log(`[Backfill] Total products updated: ${updatedCount}`);

    } catch (error) {
        console.error('[Backfill] Error during backfill:', error);
        process.exit(1);
    }
}

backfillSalesAnalytics().then(() => process.exit(0));
