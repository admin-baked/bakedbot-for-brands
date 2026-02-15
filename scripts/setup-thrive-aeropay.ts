/**
 * Setup Aeropay for Thrive Syracuse
 *
 * Configures Aeropay payment processor for Thrive Syracuse dispensary.
 * Updates location payment configuration to enable all payment methods.
 *
 * Prerequisites:
 * - FIREBASE_SERVICE_ACCOUNT_KEY environment variable set
 * - AEROPAY_MERCHANT_ID environment variable set (or update manually after script)
 *
 * Run with: npx tsx scripts/setup-thrive-aeropay.ts
 *
 * AI-THREAD: [Claude @ 2026-02-15] AEROPAY-INTEGRATION
 * Created Thrive Syracuse Aeropay configuration script.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        // Use explicit service account key from environment
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            initializeApp({
                credential: cert(serviceAccount),
            });
            console.log('✅ Using FIREBASE_SERVICE_ACCOUNT_KEY from environment\n');
        } catch (error) {
            console.error('❌ Failed to parse service account key:', error);
            process.exit(1);
        }
    } else {
        // Use Application Default Credentials (gcloud auth)
        try {
            initializeApp();
            console.log('✅ Using Application Default Credentials (gcloud auth)\n');
        } catch (error) {
            console.error('❌ Failed to initialize Firebase Admin SDK');
            console.error('   Run: gcloud auth application-default login');
            console.error('   Error:', error);
            process.exit(1);
        }
    }
}

const db = getFirestore();

const TENANT_ID = 'org_thrive_syracuse';
const LOCATION_ID = 'loc_thrive_syracuse'; // Adjust if different

interface PaymentConfig {
    enabledMethods: string[];
    // No defaultMethod - force customer selection
    aeropay: {
        enabled: boolean;
        merchantId: string;
        environment: 'sandbox' | 'production';
    };
    cannpay?: {
        enabled: boolean;
        integratorId: string;
        environment: 'sandbox' | 'production';
    };
    creditCard?: {
        enabled: boolean;
        provider: 'authorize_net';
    };
}

async function setupThriveAeropay() {
    console.log('🚀 Setting up Aeropay for Thrive Syracuse...\n');

    // Verify Aeropay merchant ID is available
    const aeropayMerchantId = process.env.AEROPAY_MERCHANT_ID;
    if (!aeropayMerchantId) {
        console.warn('⚠️  AEROPAY_MERCHANT_ID not set in environment');
        console.warn('   Using placeholder. Update manually in Firestore after setup.\n');
    }

    // Payment configuration
    const paymentConfig: PaymentConfig = {
        enabledMethods: [
            'dispensary_direct', // Pay at pickup (always available)
            'cannpay',           // SmokeyPay (existing)
            'aeropay',           // Aeropay (new)
            'credit_card',       // Authorize.Net (optional)
        ],
        // NO defaultMethod - customers must explicitly select payment method
        aeropay: {
            enabled: true,
            merchantId: aeropayMerchantId || 'AEROPAY_MERCHANT_ID_PLACEHOLDER',
            environment: 'sandbox', // Change to 'production' when going live
        },
        cannpay: {
            enabled: true,
            integratorId: process.env.CANPAY_INTEGRATOR_ID || 'CANPAY_INTEGRATOR_ID_PLACEHOLDER',
            environment: 'sandbox',
        },
        creditCard: {
            enabled: true,
            provider: 'authorize_net',
        },
    };

    // Update Location document
    const locationRef = db.collection('locations').doc(LOCATION_ID);
    const locationSnap = await locationRef.get();

    if (!locationSnap.exists) {
        console.error(`❌ Location not found: ${LOCATION_ID}`);
        console.error('   Available location IDs:');
        const locationsSnap = await db.collection('locations').limit(10).get();
        locationsSnap.docs.forEach(doc => {
            console.error(`      - ${doc.id}`);
        });
        process.exit(1);
    }

    await locationRef.set(
        {
            paymentConfig,
            updatedAt: new Date().toISOString(),
            updatedBy: 'setup-thrive-aeropay-script',
        },
        { merge: true }
    );

    console.log('✅ Location payment config updated!\n');

    // Also update tenant-level config (if needed)
    const tenantRef = db.collection('tenants').doc(TENANT_ID);
    const tenantSnap = await tenantRef.get();

    if (tenantSnap.exists) {
        await tenantRef.set(
            {
                paymentConfig: {
                    hasAeropay: true,
                    hasCannPay: true,
                    hasCreditCard: true,
                },
                updatedAt: new Date().toISOString(),
            },
            { merge: true }
        );

        console.log('✅ Tenant payment config updated!\n');
    } else {
        console.warn('⚠️  Tenant document not found, skipping tenant-level config\n');
    }

    // Summary
    console.log('📋 Configuration Summary:');
    console.log(`   - Tenant: ${TENANT_ID}`);
    console.log(`   - Location: ${LOCATION_ID}`);
    console.log(`   - Enabled Payment Methods:`);
    paymentConfig.enabledMethods.forEach(method => {
        console.log(`      ✓ ${method}`);
    });
    console.log(`   - Default Payment Method: None (force selection)`);
    console.log(`   - Aeropay Environment: ${paymentConfig.aeropay.environment}`);
    console.log(`   - Aeropay Merchant ID: ${paymentConfig.aeropay.merchantId}`);

    if (!aeropayMerchantId) {
        console.log('\n⚠️  ACTION REQUIRED:');
        console.log('   Update Aeropay merchant ID in Firestore:');
        console.log(`   locations/${LOCATION_ID}/paymentConfig/aeropay/merchantId`);
    }

    console.log('\n📍 Firestore Paths Updated:');
    console.log(`   - locations/${LOCATION_ID}`);
    console.log(`   - tenants/${TENANT_ID}`);

    console.log('\n📦 Next Steps:');
    console.log('   1. Deploy Firestore indexes: firebase deploy --only firestore:indexes');
    console.log('   2. Create Aeropay secrets in Google Cloud Secret Manager:');
    console.log('      - AEROPAY_CLIENT_ID');
    console.log('      - AEROPAY_CLIENT_SECRET');
    console.log('      - AEROPAY_MERCHANT_ID');
    console.log('      - AEROPAY_WEBHOOK_SECRET');
    console.log('   3. Deploy app: git push origin main');
    console.log('   4. Register webhook URL with Aeropay:');
    console.log('      https://bakedbot.ai/api/webhooks/aeropay');
    console.log('   5. Test Aeropay checkout flow in sandbox');
}

// Run the setup
setupThriveAeropay()
    .then(() => {
        console.log('\n🎉 Setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Setup failed:', error);
        process.exit(1);
    });
