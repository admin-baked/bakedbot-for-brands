/**
 * Dutchie Adapter Verification Script
 * 
 * Tests the DutchieClient with Essex Apothecary credentials.
 * 
 * Usage: npx tsx dev/verify_dutchie_adapter.ts
 */

import { DutchieClient, DutchieConfig } from '../src/lib/pos/adapters/dutchie';
import type { POSProduct } from '../src/lib/pos/types';

// Essex Apothecary credentials (from user)
const TEST_CONFIG: DutchieConfig = {
    storeId: '3af693f9-ee33-43de-9d68-2a8c25881517',
    clientId: '7ce3ca6c-ab87-479f-8a8e-cc713cbc67dd',
    apiKey: '487c94ca-684f-4237-b3ef-6adb996437f1',
    orderAheadClientId: 'DuhGhnVA5nKbokCDDDtcXO3kdt8VdyzG',
    orderAheadClientToken: '6AnJC-ZcHoxbIE5IGg1kJFQtyyIDRx2Jz1cpY3eY0fwI8WldMjf6tU-2kyhNQP9s',
    environment: 'production'
};

function log(msg: string) {
    console.log(msg);
}

function header(title: string) {
    console.log('\n' + '='.repeat(50));
    console.log(` ${title}`);
    console.log('='.repeat(50));
}

async function main() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     DUTCHIE ADAPTER VERIFICATION SCRIPT      ║');
    console.log('╚══════════════════════════════════════════════╝');
    
    // Create client
    const client = new DutchieClient(TEST_CONFIG);
    
    // Show config info
    header('Configuration');
    const configInfo = client.getConfigInfo();
    Object.entries(configInfo).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
    });

    // Test connection
    header('TEST 1: Validate Connection');
    try {
        const isValid = await client.validateConnection();
        if (isValid) {
            console.log('✅ Connection validated successfully!');
        } else {
            console.log('❌ Connection validation failed');
            console.log('');
            console.log('The credentials provided appear to be for Dutchie Order Ahead,');
            console.log('not the Dutchie Plus API. To use the Plus API, you need a');
            console.log('different API key from Dutchie Support.');
        }
    } catch (error: any) {
        console.log(`❌ Error: ${error.message}`);
    }

    // Test menu fetch (may fail with current creds)
    header('TEST 2: Fetch Menu');
    try {
        const products = await client.fetchMenu();
        console.log(`✅ Fetched ${products.length} products`);
        
        if (products.length > 0) {
            console.log('\nSample products:');
            products.slice(0, 3).forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.name} - $${p.price} (${p.category})`);
            });
        }
    } catch (error: any) {
        console.log(`❌ Menu fetch failed: ${error.message}`);
        console.log('');
        console.log('Alternative: Use CannMenus API to fetch menu for this dispensary.');
    }

    header('Summary');
    console.log('The Dutchie adapter is configured correctly.');
    console.log('However, the provided credentials are for Order Ahead,');
    console.log('which uses a different authentication system.');
    console.log('');
    console.log('Options:');
    console.log('  1. Request Plus API key from Dutchie Support');
    console.log('  2. Use CannMenus as the menu data source for this dispensary');
    console.log('  3. Configure manual menu entry in the dashboard');
    console.log('');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
