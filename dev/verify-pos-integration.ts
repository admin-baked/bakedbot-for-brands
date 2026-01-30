/**
 * POS Integration Verification Script
 *
 * Tests the complete Alleaves → BakedBot integration
 * Verifies customers, orders, caching, and segmentation
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import { ALLeavesClient, type ALLeavesConfig } from '../src/lib/pos/adapters/alleaves';
import { calculateSegment } from '../src/types/customers';

const ORG_ID = 'org_thrive_syracuse';

// Initialize Firebase
const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

interface VerificationResults {
    customers: {
        fetched: number;
        withOrders: number;
        segments: Record<string, number>;
        avgSpend: number;
        topSpender: any;
    };
    orders: {
        fetched: number;
        totalRevenue: number;
        avgOrderValue: number;
        statusBreakdown: Record<string, number>;
        mostRecent: any;
    };
    integration: {
        posConfigFound: boolean;
        authSuccessful: boolean;
        cacheWorking: boolean;
    };
}

async function verifyIntegration(): Promise<VerificationResults> {
    console.log('🔍 VERIFYING THRIVE SYRACUSE POS INTEGRATION\n');
    console.log('═══════════════════════════════════════════════════════\n');

    const results: VerificationResults = {
        customers: {
            fetched: 0,
            withOrders: 0,
            segments: {},
            avgSpend: 0,
            topSpender: null,
        },
        orders: {
            fetched: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            statusBreakdown: {},
            mostRecent: null,
        },
        integration: {
            posConfigFound: false,
            authSuccessful: false,
            cacheWorking: false,
        },
    };

    // 1. Verify POS Configuration
    console.log('📋 Step 1: Checking POS Configuration...\n');

    const locationsSnap = await db.collection('locations')
        .where('orgId', '==', ORG_ID)
        .limit(1)
        .get();

    if (locationsSnap.empty) {
        console.log('❌ No location found for org\n');
        return results;
    }

    const locationData = locationsSnap.docs[0].data();
    const posConfig = locationData?.posConfig;

    if (!posConfig || posConfig.provider !== 'alleaves') {
        console.log('❌ No Alleaves POS config found\n');
        return results;
    }

    results.integration.posConfigFound = true;
    console.log('✅ POS Config Found');
    console.log(`   Provider: ${posConfig.provider}`);
    console.log(`   Status: ${posConfig.status}`);
    console.log(`   Location ID: ${posConfig.locationId}\n`);

    // 2. Initialize Alleaves Client
    console.log('🔐 Step 2: Testing Alleaves Authentication...\n');

    const alleavesConfig: ALLeavesConfig = {
        apiKey: posConfig.apiKey,
        username: posConfig.username || process.env.ALLEAVES_USERNAME,
        password: posConfig.password || process.env.ALLEAVES_PASSWORD,
        pin: posConfig.pin || process.env.ALLEAVES_PIN,
        storeId: posConfig.storeId,
        locationId: posConfig.locationId || posConfig.storeId,
        partnerId: posConfig.partnerId,
        environment: posConfig.environment || 'production',
    };

    let client: ALLeavesClient;
    try {
        client = new ALLeavesClient(alleavesConfig);
        // Test auth by fetching a small number of customers
        await client.getAllCustomers(1, 1);
        results.integration.authSuccessful = true;
        console.log('✅ Authentication Successful\n');
    } catch (error: any) {
        console.log(`❌ Authentication Failed: ${error.message}\n`);
        return results;
    }

    // 3. Verify Customers
    console.log('👥 Step 3: Fetching Customers from Alleaves...\n');

    try {
        const customers = await client.getAllCustomersPaginated(30);
        results.customers.fetched = customers.length;

        console.log(`✅ Fetched ${customers.length} customers\n`);

        // Show sample customer data structure
        if (customers.length > 0) {
            console.log('📋 Sample Customer Data (first customer):\n');
            const sample = customers[0];
            const sampleKeys = Object.keys(sample).slice(0, 20);
            sampleKeys.forEach(key => {
                const value = sample[key];
                const displayValue = typeof value === 'string' && value.length > 50
                    ? value.substring(0, 50) + '...'
                    : value;
                console.log(`   ${key}: ${displayValue}`);
            });
            console.log(`   ... (${Object.keys(sample).length} total fields)\n`);
        }

        // Analyze customer data
        let totalSpent = 0;
        let topSpender = { name: '', amount: 0 };
        const segments: Record<string, number> = {
            vip: 0,
            loyal: 0,
            new: 0,
            at_risk: 0,
            slipping: 0,
            churned: 0,
            high_value: 0,
            frequent: 0,
        };

        customers.forEach((customer: any) => {
            const spent = parseFloat(customer.total_spent || 0);
            const orders = parseInt(customer.total_orders || 0);

            totalSpent += spent;

            if (orders > 0) {
                results.customers.withOrders++;
            }

            if (spent > topSpender.amount) {
                topSpender = {
                    name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
                    amount: spent,
                };
            }

            // Calculate segment
            const lastOrderDate = customer.last_order_date ? new Date(customer.last_order_date) : undefined;
            const daysSinceLastOrder = lastOrderDate
                ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
                : undefined;

            const segment = calculateSegment({
                totalSpent: spent,
                orderCount: orders,
                daysSinceLastOrder,
            } as any);

            segments[segment] = (segments[segment] || 0) + 1;
        });

        results.customers.avgSpend = totalSpent / customers.length;
        results.customers.topSpender = topSpender;
        results.customers.segments = segments;

        console.log('📊 CUSTOMER ANALYSIS:\n');
        console.log(`   Total Customers: ${customers.length}`);
        console.log(`   With Orders: ${results.customers.withOrders} (${((results.customers.withOrders / customers.length) * 100).toFixed(1)}%)`);
        console.log(`   Average Spent: $${results.customers.avgSpend.toFixed(2)}`);
        console.log(`   Top Spender: ${topSpender.name} ($${topSpender.amount.toFixed(2)})\n`);

        console.log('   Segment Breakdown:');
        Object.entries(segments)
            .sort((a, b) => b[1] - a[1])
            .forEach(([segment, count]) => {
                if (count > 0) {
                    console.log(`      ${segment.padEnd(12)} ${count} (${((count / customers.length) * 100).toFixed(1)}%)`);
                }
            });
        console.log('');

    } catch (error: any) {
        console.log(`❌ Failed to fetch customers: ${error.message}\n`);
    }

    // 4. Verify Orders
    console.log('📦 Step 4: Fetching Orders from Alleaves...\n');

    try {
        const orders = await client.getAllOrders(100);
        results.orders.fetched = orders.length;

        console.log(`✅ Fetched ${orders.length} orders\n`);

        // Show sample order data structure
        if (orders.length > 0) {
            console.log('📋 Sample Order Data (first order):\n');
            const sample = orders[0];
            const sampleKeys = Object.keys(sample).slice(0, 20);
            sampleKeys.forEach(key => {
                const value = sample[key];
                const displayValue = typeof value === 'object'
                    ? JSON.stringify(value).substring(0, 80) + '...'
                    : typeof value === 'string' && value.length > 50
                    ? value.substring(0, 50) + '...'
                    : value;
                console.log(`   ${key}: ${displayValue}`);
            });
            console.log(`   ... (${Object.keys(sample).length} total fields)\n`);
        }

        // Analyze order data
        let totalRevenue = 0;
        let mostRecent: any = null;
        const statusBreakdown: Record<string, number> = {};

        orders.forEach((order: any) => {
            const total = parseFloat(order.total || order.amount || 0);
            totalRevenue += total;

            const status = order.status || 'unknown';
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

            if (!mostRecent || new Date(order.created_at) > new Date(mostRecent.created_at)) {
                mostRecent = order;
            }
        });

        results.orders.totalRevenue = totalRevenue;
        results.orders.avgOrderValue = totalRevenue / orders.length;
        results.orders.statusBreakdown = statusBreakdown;
        results.orders.mostRecent = mostRecent;

        console.log('📊 ORDER ANALYSIS:\n');
        console.log(`   Total Orders: ${orders.length}`);
        console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);
        console.log(`   Average Order: $${results.orders.avgOrderValue.toFixed(2)}\n`);

        console.log('   Status Breakdown:');
        Object.entries(statusBreakdown)
            .sort((a, b) => b[1] - a[1])
            .forEach(([status, count]) => {
                console.log(`      ${status.padEnd(15)} ${count} (${((count / orders.length) * 100).toFixed(1)}%)`);
            });
        console.log('');

        if (mostRecent) {
            console.log('   Most Recent Order:');
            console.log(`      ID: ${mostRecent.id}`);
            console.log(`      Date: ${mostRecent.created_at}`);
            console.log(`      Total: $${parseFloat(mostRecent.total || 0).toFixed(2)}\n`);
        }

    } catch (error: any) {
        console.log(`❌ Failed to fetch orders: ${error.message}\n`);
    }

    // 5. Test Cache Performance
    console.log('⚡ Step 5: Testing Cache Performance...\n');

    try {
        const startTime1 = Date.now();
        await client.getAllCustomers(1, 10);
        const duration1 = Date.now() - startTime1;

        const startTime2 = Date.now();
        await client.getAllCustomers(1, 10);
        const duration2 = Date.now() - startTime2;

        console.log(`   First call: ${duration1}ms`);
        console.log(`   Second call: ${duration2}ms`);

        if (duration2 < duration1 * 0.5) {
            results.integration.cacheWorking = true;
            console.log('   ✅ Cache is working (2nd call faster)\n');
        } else {
            console.log('   ⚠️  Cache may not be active (similar times)\n');
        }
    } catch (error: any) {
        console.log(`   ❌ Cache test failed: ${error.message}\n`);
    }

    return results;
}

// Summary
async function printSummary(results: VerificationResults) {
    console.log('\n═══════════════════════════════════════════════════════\n');
    console.log('📋 INTEGRATION VERIFICATION SUMMARY\n');

    const checks = [
        { name: 'POS Config Found', status: results.integration.posConfigFound },
        { name: 'Authentication Successful', status: results.integration.authSuccessful },
        { name: 'Customers Fetched', status: results.customers.fetched > 0 },
        { name: 'Orders Fetched', status: results.orders.fetched > 0 },
        { name: 'Cache Working', status: results.integration.cacheWorking },
    ];

    checks.forEach(check => {
        const icon = check.status ? '✅' : '❌';
        console.log(`   ${icon} ${check.name}`);
    });

    const allPassed = checks.every(c => c.status);

    console.log('\n═══════════════════════════════════════════════════════\n');

    if (allPassed) {
        console.log('🎉 ALL CHECKS PASSED - Integration is working!\n');
        console.log('Next steps:');
        console.log('1. Test in dashboard at /dashboard/customers and /dashboard/orders');
        console.log('2. Verify segmentation accuracy');
        console.log('3. Deploy to production\n');
    } else {
        console.log('⚠️  SOME CHECKS FAILED - Review errors above\n');
    }
}

// Run verification
(async () => {
    try {
        const results = await verifyIntegration();
        await printSummary(results);
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
})();
