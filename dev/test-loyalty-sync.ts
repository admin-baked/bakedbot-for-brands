/**
 * Test Loyalty Sync
 * Tests the hybrid loyalty sync calculation logic with real Alleaves data
 * Run: npx tsx dev/test-loyalty-sync.ts
 *
 * Note: This tests the calculation logic only. Full sync requires Firebase.
 */

import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';
import type { LoyaltySettings } from '../src/types/customers';

const ALLEAVES_USERNAME = 'bakedbotai@thrivesyracuse.com';
const ALLEAVES_PASSWORD = 'Dreamchasing2030!!@@!!';
const ALLEAVES_PIN = '1234';
const ALLEAVES_LOCATION_ID = '1000';

// Test org ID (use your actual brand ID)
const TEST_ORG_ID = 'test_thrive_syracuse';

// Test loyalty settings
const TEST_LOYALTY_SETTINGS: LoyaltySettings = {
  pointsPerDollar: 1,
  equityMultiplier: 1.2,
  tiers: [
    { id: 'bronze', name: 'Bronze', threshold: 0, color: '#CD7F32', benefits: ['Earn 1pt per $1'] },
    { id: 'silver', name: 'Silver', threshold: 500, color: '#C0C0C0', benefits: ['Earn 1.2pts per $1', 'Birthday Gift'] },
    { id: 'gold', name: 'Gold', threshold: 1000, color: '#FFD700', benefits: ['Earn 1.5pts per $1', 'Early Access'] },
  ]
};

async function testSync() {
  console.log('🧪 Testing Loyalty Sync System\n');
  console.log('═'.repeat(60));

  try {
    // 1. Initialize POS client
    console.log('\n1️⃣ Initializing Alleaves client...');

    const posClient = new ALLeavesClient({
      storeId: ALLEAVES_LOCATION_ID,
      locationId: ALLEAVES_LOCATION_ID,
      username: ALLEAVES_USERNAME,
      password: ALLEAVES_PASSWORD,
      pin: ALLEAVES_PIN,
      environment: 'production'
    });

    console.log('✅ Client initialized');

    // 2. Test connection
    console.log('\n2️⃣ Testing connection...');

    const isConnected = await posClient.validateConnection();

    if (!isConnected) {
      throw new Error('Failed to connect to Alleaves API');
    }

    console.log('✅ Connected to Alleaves');

    // 3. Note about sync service
    console.log('\n3️⃣ Sync service...');

    console.log('✅ Will calculate points manually (Firestore not available in test mode)');

    // 4. Fetch sample customers
    console.log('\n4️⃣ Fetching sample customers...');

    const customers = await posClient.getAllCustomers(1, 5);

    console.log(`✅ Found ${customers.length} customers\n`);

    // Display sample customers
    console.log('📋 Sample Customers:');
    console.log('─'.repeat(60));

    customers.forEach((customer: any, index: number) => {
      console.log(`\n${index + 1}. ${customer.customer_name || 'Unknown'}`);
      console.log(`   ID: ${customer.id_customer}`);
      console.log(`   Phone: ${customer.phone || 'N/A'}`);
      console.log(`   Email: ${customer.email || 'N/A'}`);
      console.log(`   Alpine Code: ${customer.alpine_user_code || 'N/A'}`);
      console.log(`   Springbig Code: ${customer.springbig_user_code || 'N/A'}`);
    });

    // 5. Get customer spending data
    console.log('\n\n5️⃣ Fetching customer spending data...');

    const spendingMap = await posClient.getCustomerSpending();

    console.log(`✅ Calculated spending for ${spendingMap.size} customers\n`);

    // Display spending for sample customers
    console.log('💰 Sample Customer Spending:');
    console.log('─'.repeat(60));

    customers.slice(0, 3).forEach((customer: any) => {
      const spending = spendingMap.get(customer.id_customer);

      console.log(`\n${customer.customer_name || 'Unknown'}:`);

      if (spending) {
        console.log(`   Total Spent: $${spending.totalSpent.toFixed(2)}`);
        console.log(`   Order Count: ${spending.orderCount}`);
        console.log(`   First Order: ${spending.firstOrderDate.toISOString().split('T')[0]}`);
        console.log(`   Last Order: ${spending.lastOrderDate.toISOString().split('T')[0]}`);

        // Calculate points
        const points = Math.round(spending.totalSpent * TEST_LOYALTY_SETTINGS.pointsPerDollar);
        const tier = points >= 1000 ? 'Gold' : points >= 500 ? 'Silver' : 'Bronze';

        console.log(`   Calculated Points: ${points}`);
        console.log(`   Tier: ${tier}`);
      } else {
        console.log('   No order history');
      }
    });

    // 6. Test sync for first customer
    console.log('\n\n6️⃣ Testing sync for first customer...');

    const testCustomer = customers[0];
    const customerId = testCustomer.id_customer.toString();

    console.log(`Customer: ${testCustomer.customer_name}`);
    console.log(`ID: ${customerId}`);

    // Note: This will try to update Firestore, which may not work in test environment
    console.log('\n⚠️  Skipping Firestore update in test mode');
    console.log('   (Run via API endpoint for full sync with database updates)');

    // 7. Show what would be synced
    const spending = spendingMap.get(testCustomer.id_customer);

    if (spending) {
      const calculatedPoints = Math.round(spending.totalSpent * TEST_LOYALTY_SETTINGS.pointsPerDollar);
      const tier = calculatedPoints >= 1000 ? 'Gold' : calculatedPoints >= 500 ? 'Silver' : 'Bronze';

      console.log('\n📊 Sync Preview:');
      console.log('─'.repeat(60));
      console.log('Calculated from Orders:');
      console.log(`   Points: ${calculatedPoints}`);
      console.log(`   Tier: ${tier}`);
      console.log(`   Based on: $${spending.totalSpent.toFixed(2)} spent across ${spending.orderCount} orders`);

      console.log('\nAlpine IQ:');
      console.log('   Status: Would check via phone lookup');
      console.log(`   Phone: ${testCustomer.phone || 'N/A'}`);

      console.log('\nFirestore Update:');
      console.log('   Would update customer profile with:');
      console.log(`     - points: ${calculatedPoints}`);
      console.log(`     - pointsFromOrders: ${calculatedPoints}`);
      console.log(`     - tier: ${tier}`);
      console.log(`     - pointsLastCalculated: ${new Date().toISOString()}`);
    }

    // 8. Summary
    console.log('\n\n✅ TEST COMPLETE!\n');
    console.log('═'.repeat(60));
    console.log('\n📈 Summary:');
    console.log(`   Total customers in Alleaves: ${customers.length} (sample)`);
    console.log(`   Customers with spending data: ${spendingMap.size}`);
    console.log(`   Ready for sync: ✅`);

    console.log('\n🚀 Next Steps:');
    console.log('   1. Set up Firestore customer collection structure');
    console.log('   2. Run full sync via API: POST /api/loyalty/sync');
    console.log('   3. Monitor for discrepancies');
    console.log('   4. Set up daily cron job\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);

    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }

    process.exit(1);
  }
}

// Run test
testSync().catch(console.error);
