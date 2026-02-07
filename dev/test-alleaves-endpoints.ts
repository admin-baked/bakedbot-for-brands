/**
 * Test script for Alleaves API endpoints
 *
 * Tests the new endpoints added for:
 * - Phase 1: Discounts
 * - Phase 2: Batch expiration
 * - Phase 3: Metadata (brands, categories, vendors)
 *
 * Usage:
 *   Option 1: Add credentials to .env.local:
 *     ALLEAVES_USERNAME=your_username
 *     ALLEAVES_PASSWORD=your_password
 *     ALLEAVES_PIN=your_pin (optional)
 *     ALLEAVES_LOCATION_ID=1
 *
 *   Option 2: Set environment variables inline:
 *     ALLEAVES_USERNAME=xxx ALLEAVES_PASSWORD=xxx npx tsx dev/test-alleaves-endpoints.ts
 *
 *   Option 3: Use Firebase secrets locally:
 *     firebase apphosting:secrets:access ALLEAVES_USERNAME
 *     firebase apphosting:secrets:access ALLEAVES_PASSWORD
 *
 * Run: npx tsx dev/test-alleaves-endpoints.ts
 */

import { ALLeavesClient, type ALLeavesConfig } from '../src/lib/pos/adapters/alleaves';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

const ORG_ID = 'org_thrive_syracuse';

async function main() {
    console.log('='.repeat(60));
    console.log('ALLEAVES API ENDPOINT TEST');
    console.log('='.repeat(60));
    console.log();

    // Initialize client
    const alleavesConfig: ALLeavesConfig = {
        username: process.env.ALLEAVES_USERNAME || '',
        password: process.env.ALLEAVES_PASSWORD || '',
        pin: process.env.ALLEAVES_PIN,
        storeId: process.env.ALLEAVES_LOCATION_ID || '1',
        locationId: process.env.ALLEAVES_LOCATION_ID || '1',
    };

    if (!alleavesConfig.username || !alleavesConfig.password) {
        console.error('Missing ALLEAVES_USERNAME or ALLEAVES_PASSWORD in environment');
        process.exit(1);
    }

    const client = new ALLeavesClient(alleavesConfig);

    // Test connection
    console.log('1. Testing Connection...');
    try {
        const isValid = await client.validateConnection();
        console.log(`   Connection: ${isValid ? '✅ Valid' : '❌ Failed'}`);
    } catch (error) {
        console.log(`   Connection: ❌ Error - ${error}`);
    }
    console.log();

    // Test Phase 1: Discounts
    console.log('2. Testing Discounts (Phase 1)...');
    try {
        const discounts = await client.getDiscounts();
        console.log(`   Discounts found: ${discounts.length}`);
        if (discounts.length > 0) {
            console.log('   Sample discounts:');
            discounts.slice(0, 3).forEach(d => {
                console.log(`     - ${d.name}: ${d.discount_type} ${d.discount_value}${d.discount_type === 'percent' ? '%' : ''}`);
                if (d.conditions?.categories) {
                    console.log(`       Categories: ${d.conditions.categories.join(', ')}`);
                }
                if (d.conditions?.brands) {
                    console.log(`       Brands: ${d.conditions.brands.join(', ')}`);
                }
            });
        } else {
            console.log('   (No active discounts configured in Alleaves)');
        }
    } catch (error) {
        console.log(`   Discounts: ❌ Error - ${error}`);
    }
    console.log();

    // Test Phase 2: Batch Expiration
    console.log('3. Testing Batch Expiration (Phase 2)...');
    try {
        const batches = await client.searchBatches({
            expiringWithinDays: 60,
            minQuantity: 1,
        });
        console.log(`   Batches expiring in 60 days: ${batches.length}`);
        if (batches.length > 0) {
            console.log('   Soonest expiring:');
            batches
                .filter(b => b.days_until_expiry !== undefined)
                .sort((a, b) => (a.days_until_expiry || 999) - (b.days_until_expiry || 999))
                .slice(0, 5)
                .forEach(b => {
                    console.log(`     - ${b.item_name}: ${b.days_until_expiry} days, qty: ${b.quantity}`);
                });
        } else {
            console.log('   (No batches expiring within 60 days)');
        }
    } catch (error) {
        console.log(`   Batch search: ❌ Error - ${error}`);
    }
    console.log();

    // Test Phase 3: Metadata
    console.log('4. Testing Metadata Endpoints (Phase 3)...');

    // Brands
    try {
        const brands = await client.getBrands();
        console.log(`   Brands: ${brands.length} found`);
        if (brands.length > 0) {
            console.log(`     Top 5: ${brands.slice(0, 5).map(b => b.name).join(', ')}`);
        }
    } catch (error) {
        console.log(`   Brands: ❌ Error - ${error}`);
    }

    // Categories
    try {
        const categories = await client.getCategories();
        console.log(`   Categories: ${categories.length} found`);
        if (categories.length > 0) {
            console.log(`     All: ${categories.map(c => c.name).join(', ')}`);
        }
    } catch (error) {
        console.log(`   Categories: ❌ Error - ${error}`);
    }

    // Vendors
    try {
        const vendors = await client.getVendors();
        console.log(`   Vendors: ${vendors.length} found`);
        if (vendors.length > 0) {
            console.log(`     Top 5: ${vendors.slice(0, 5).map(v => v.name).join(', ')}`);
        }
    } catch (error) {
        console.log(`   Vendors: ❌ Error - ${error}`);
    }

    // Location
    try {
        const location = await client.getLocationDetails();
        if (location) {
            console.log(`   Location: ${location.name}`);
            console.log(`     License: ${location.licenseNumber || 'N/A'}`);
            console.log(`     Timezone: ${location.timezone || 'N/A'}`);
            if (location.address) {
                console.log(`     Address: ${location.address.city}, ${location.address.state}`);
            }
        } else {
            console.log('   Location: Not found');
        }
    } catch (error) {
        console.log(`   Location: ❌ Error - ${error}`);
    }
    console.log();

    // Test menu with discounts
    console.log('5. Testing Menu with Discounts Applied...');
    try {
        const productsWithDiscounts = await client.fetchMenuWithDiscounts();
        const onSale = productsWithDiscounts.filter(p => p.isOnSale);
        console.log(`   Total products: ${productsWithDiscounts.length}`);
        console.log(`   Products on sale: ${onSale.length}`);
        if (onSale.length > 0) {
            console.log('   Sample sale items:');
            onSale.slice(0, 5).forEach(p => {
                console.log(`     - ${p.name}: $${p.originalPrice} → $${p.salePrice} (${p.saleBadgeText})`);
            });
        }
    } catch (error) {
        console.log(`   Menu with discounts: ❌ Error - ${error}`);
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
    console.log();
    console.log('Next steps:');
    console.log('  1. If discounts returned 0, check Alleaves admin for active promotions');
    console.log('  2. If batches returned 0, may need to adjust expiry threshold');
    console.log('  3. Run syncPOSDiscounts() to update Firestore publicViews');
    console.log('  4. Run syncPOSMetadata() to cache brands/categories for filters');
    console.log();
}

main().catch(console.error);
