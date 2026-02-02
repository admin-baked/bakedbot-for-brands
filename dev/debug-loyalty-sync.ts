/**
 * Debug Loyalty Sync API
 * Tests the sync endpoint to identify issues
 * Run: npx tsx dev/debug-loyalty-sync.ts
 */

const API_BASE_URL = 'http://localhost:3000';
const ORG_ID = 'thrive_syracuse'; // Your brand ID

async function debugSync() {
  console.log('🔍 Debugging Loyalty Sync API\n');
  console.log('═'.repeat(60));

  try {
    // Test 1: Check if API endpoint exists
    console.log('\n1️⃣ Testing API endpoint availability...\n');

    const testResponse = await fetch(`${API_BASE_URL}/api/loyalty/sync?orgId=${ORG_ID}`, {
      method: 'GET',
    });

    console.log(`Status: ${testResponse.status} ${testResponse.statusText}`);

    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ API endpoint responding');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await testResponse.text();
      console.log('❌ API error:', errorText);
    }

    // Test 2: Try the POST sync
    console.log('\n2️⃣ Testing POST sync...\n');

    const syncResponse = await fetch(`${API_BASE_URL}/api/loyalty/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orgId: ORG_ID }),
    });

    console.log(`Status: ${syncResponse.status} ${syncResponse.statusText}`);

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.log('❌ Sync failed:', errorText);

      try {
        const errorJson = JSON.parse(errorText);
        console.log('\nError details:', JSON.stringify(errorJson, null, 2));
      } catch {
        console.log('\nRaw error:', errorText.substring(0, 500));
      }
    } else {
      const data = await syncResponse.json();
      console.log('✅ Sync request accepted');
      console.log('Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error);

    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  console.log('\n═'.repeat(60));
  console.log('\n💡 Troubleshooting tips:');
  console.log('1. Ensure dev server is running (npm run dev)');
  console.log('2. Check Firebase credentials are configured');
  console.log('3. Verify brand document has posConfig in Firestore');
  console.log('4. Check browser console for client-side errors');
  console.log('5. Check Network tab in DevTools for the actual request\n');
}

debugSync().catch(console.error);
