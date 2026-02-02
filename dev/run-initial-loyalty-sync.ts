/**
 * Initial Loyalty Sync Setup
 *
 * This script runs the initial loyalty sync for your organization.
 * It will:
 * 1. Fetch all customers from Alleaves
 * 2. Calculate loyalty points from order history
 * 3. Sync with Alpine IQ
 * 4. Update Firestore customer profiles
 *
 * Prerequisites:
 * - Next.js dev server running (npm run dev)
 * - Firebase credentials configured
 * - Alleaves POS configured in brand document
 *
 * Run: npx tsx dev/run-initial-loyalty-sync.ts
 */

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ORG_ID = 'thrive_syracuse'; // Update with your brand ID

async function runInitialSync() {
  console.log('🚀 Starting Initial Loyalty Sync\n');
  console.log('═'.repeat(60));
  console.log(`Organization: ${ORG_ID}`);
  console.log(`API: ${API_BASE_URL}`);
  console.log('═'.repeat(60) + '\n');

  try {
    // Step 1: Check sync status before starting
    console.log('1️⃣ Checking current sync status...\n');

    const statusResponse = await fetch(
      `${API_BASE_URL}/api/loyalty/sync?orgId=${ORG_ID}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!statusResponse.ok) {
      console.log('⚠️  No existing sync data (this is expected for initial sync)\n');
    } else {
      const statusData = await statusResponse.json();
      console.log('📊 Current Status:');
      console.log(JSON.stringify(statusData.stats, null, 2));
      console.log('');
    }

    // Step 2: Run the full sync
    console.log('2️⃣ Running full loyalty sync...');
    console.log('   This may take a few minutes for large customer bases...\n');

    const startTime = Date.now();

    const syncResponse = await fetch(`${API_BASE_URL}/api/loyalty/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orgId: ORG_ID,
        force: true, // Force resync even if recently synced
      }),
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      throw new Error(`Sync failed: ${syncResponse.status} - ${errorText}`);
    }

    const syncData = await syncResponse.json();
    const duration = Date.now() - startTime;

    // Step 3: Display results
    console.log('\n✅ SYNC COMPLETE!\n');
    console.log('═'.repeat(60));
    console.log('📈 Results:');
    console.log('─'.repeat(60));
    console.log(`Total Processed:   ${syncData.result.totalProcessed} customers`);
    console.log(`Successful:        ${syncData.result.successful} ✅`);
    console.log(`Failed:            ${syncData.result.failed} ❌`);
    console.log(`Discrepancies:     ${syncData.result.discrepancies.length} ⚠️`);
    console.log(`Duration:          ${(duration / 1000).toFixed(2)}s`);
    console.log('═'.repeat(60) + '\n');

    // Step 4: Show discrepancies if any
    if (syncData.result.discrepancies.length > 0) {
      console.log('⚠️  DISCREPANCIES DETECTED\n');
      console.log('The following customers have >10% difference between calculated and Alpine IQ points:\n');
      console.log('─'.repeat(60));

      syncData.result.discrepancies.slice(0, 10).forEach((disc: any, i: number) => {
        const percent = ((disc.difference / disc.alpine) * 100).toFixed(1);
        console.log(`${i + 1}. Customer ${disc.customerId}`);
        console.log(`   Calculated: ${disc.calculated} points`);
        console.log(`   Alpine IQ:  ${disc.alpine} points`);
        console.log(`   Difference: ${disc.difference} (${percent}%)\n`);
      });

      if (syncData.result.discrepancies.length > 10) {
        console.log(`   ... and ${syncData.result.discrepancies.length - 10} more\n`);
      }

      console.log('💡 Tip: Review these discrepancies to ensure data accuracy.\n');
    }

    // Step 5: Show errors if any
    if (syncData.result.errors.length > 0) {
      console.log('❌ ERRORS ENCOUNTERED\n');
      console.log('─'.repeat(60));

      syncData.result.errors.slice(0, 5).forEach((err: any, i: number) => {
        console.log(`${i + 1}. Customer ${err.customerId}: ${err.error}`);
      });

      if (syncData.result.errors.length > 5) {
        console.log(`   ... and ${syncData.result.errors.length - 5} more\n`);
      }
    }

    // Step 6: Verify with status check
    console.log('3️⃣ Verifying sync...\n');

    const verifyResponse = await fetch(
      `${API_BASE_URL}/api/loyalty/sync?orgId=${ORG_ID}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ Verification Complete:');
      console.log(JSON.stringify(verifyData.stats, null, 2));
      console.log('');
    }

    // Final summary
    console.log('\n🎉 SUCCESS!\n');
    console.log('═'.repeat(60));
    console.log('Next Steps:');
    console.log('1. ✅ Review discrepancies in admin dashboard');
    console.log('2. ✅ Set up daily cron job for automatic syncs');
    console.log('3. ✅ Test with agents (ask Smokey to check customer loyalty)');
    console.log('4. ✅ Monitor Firestore customers collection');
    console.log('═'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ SYNC FAILED\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('1. Ensure Next.js dev server is running (npm run dev)');
    console.error('2. Check Firebase credentials are configured');
    console.error('3. Verify Alleaves POS config in brand document');
    console.error('4. Check API endpoint is accessible\n');

    process.exit(1);
  }
}

// Run the sync
runInitialSync().catch(console.error);
