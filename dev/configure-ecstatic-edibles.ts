/**
 * Configure Ecstatic Edibles - First Hemp E-Commerce Pilot Customer
 *
 * This script:
 * 1. Finds the user by email (ecstaticedibles@bakedbot.ai)
 * 2. Creates the brand with red/white/black theme
 * 3. Creates the organization with pilot plan
 * 4. Sets custom claims for dashboard access
 * 5. Configures for online_only (shipping) purchase model
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});
const auth = getAuth(app);
const firestore = getFirestore(app);

// Configuration
const EMAIL = 'ecstaticedibles@bakedbot.ai';
const BRAND_NAME = 'Ecstatic Edibles';
const BRAND_SLUG = 'ecstaticedibles';
const BRAND_ID = 'brand_ecstatic_edibles';
const ORG_ID = 'org_ecstatic_edibles';

async function main() {
    console.log('🔍 Finding user:', EMAIL, '\n');

    // Find user by email
    let user;
    try {
        user = await auth.getUserByEmail(EMAIL);
        console.log('✅ Found user:', user.uid);
        console.log('   Email:', user.email);
        console.log('   Created:', user.metadata.creationTime);
        console.log('   Last Sign In:', user.metadata.lastSignInTime);
        console.log('   Current Claims:', JSON.stringify(user.customClaims || {}));
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.log('❌ User not found. Creating new user...');
            user = await auth.createUser({
                email: EMAIL,
                emailVerified: true,
                displayName: BRAND_NAME,
            });
            console.log('✅ Created new user:', user.uid);
        } else {
            throw error;
        }
    }

    const UID = user.uid;

    console.log('\n⚙️ Configuring Ecstatic Edibles pilot account...\n');

    // 1. Create Brand with red/white/black theme
    console.log('📦 Creating brand:', BRAND_NAME);
    await firestore.collection('brands').doc(BRAND_ID).set({
        id: BRAND_ID,
        name: BRAND_NAME,
        slug: BRAND_SLUG,
        description: 'Premium hemp edibles shipped nationwide. Experience the ecstasy of quality CBD & Delta-8 treats.',
        tagline: 'Experience Ecstasy',
        website: 'https://bakedbot.ai/ecstaticedibles',
        verified: true,
        verificationStatus: 'verified',
        claimStatus: 'claimed',
        ownerId: UID,

        // Red/White/Black theme
        theme: {
            primaryColor: '#DC2626',    // Red
            secondaryColor: '#000000',  // Black
            accentColor: '#FFFFFF',     // White
            heroImageUrl: '',
        },

        // Chatbot config
        chatbotConfig: {
            enabled: true,
            botName: 'Eddie',
            welcomeMessage: 'Hey! I\'m Eddie from Ecstatic Edibles. Looking for premium hemp edibles? I can help you find the perfect treat!',
            personality: 'friendly, knowledgeable, enthusiastic about hemp products',
            tone: 'casual but professional',
            sellingPoints: 'Premium ingredients, lab-tested, ships nationwide, free shipping',
        },

        // E-commerce settings
        purchaseModel: 'online_only',
        shipsNationwide: true,
        menuDesign: 'brand', // Use brand hero design

        // Shipping address for footer
        shippingAddress: {
            street: '25690 Frampton Ave #422',
            city: 'Harbor City',
            state: 'CA',
            zip: '90710',
        },
        contactEmail: 'ecstaticedibles@bakedbot.ai',
        contactPhone: '',

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Brand created with red/white/black theme and shipping address');

    // 2. Create Organization with pilot/enterprise features
    console.log('🏢 Creating organization');
    await firestore.collection('organizations').doc(ORG_ID).set({
        id: ORG_ID,
        name: BRAND_NAME,
        type: 'brand',
        ownerId: UID,
        brandId: BRAND_ID,

        // Full access for pilot
        settings: {
            policyPack: 'permissive',
            allowOverrides: true,
            hipaaMode: false,
            purchaseModel: 'online_only',
            paymentProvider: 'authorize_net',
            shippingEnabled: true,
            freeShipping: true,
        },

        // Pilot plan with full features
        billing: {
            subscriptionStatus: 'active',
            planId: 'pilot',
            planName: 'Pilot Partner',
            monthlyPrice: 0, // Free during pilot
            billingCycleStart: new Date().toISOString(),
            features: {
                maxZips: 1000,
                maxPlaybooks: 100,
                maxProducts: 1000,
                advancedReporting: true,
                prioritySupport: true,
                coveragePacksEnabled: true,
                apiAccess: true,
                whiteLabel: true,
                customDomain: true,
            }
        },

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Organization created with pilot plan');

    // 3. Update/Create User Profile
    console.log('👤 Updating user profile');
    await firestore.collection('users').doc(UID).set({
        uid: UID,
        email: EMAIL,
        displayName: BRAND_NAME,
        role: 'brand',
        approvalStatus: 'approved', // CRITICAL: Must be approved to access dashboard
        isNewUser: false,
        onboardingCompletedAt: new Date().toISOString(),
        organizationIds: [ORG_ID],
        currentOrgId: ORG_ID,
        brandId: BRAND_ID,

        billing: {
            planId: 'pilot',
            planName: 'Pilot Partner',
            status: 'active',
            monthlyPrice: 0
        },

        // Permissions - full access
        permissions: {
            canManageProducts: true,
            canManageOrders: true,
            canManageSettings: true,
            canViewAnalytics: true,
            canManageTeam: true,
        },

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ User profile updated with approved status');

    // 4. Set Custom Claims - CRITICAL for authentication
    console.log('🔐 Setting custom claims');
    await auth.setCustomUserClaims(UID, {
        role: 'brand',
        orgId: ORG_ID,
        brandId: BRAND_ID,
        planId: 'pilot',
        approvalStatus: 'approved', // CRITICAL
    });
    console.log('✅ Custom claims set');

    // 5. Revoke refresh tokens to force re-authentication
    // This prevents 400 errors from old tokens after claims change
    console.log('🔄 Revoking old refresh tokens');
    await auth.revokeRefreshTokens(UID);
    console.log('✅ Refresh tokens revoked - user must sign in fresh');

    // 6. Verify the configuration
    console.log('\n🔍 Verifying configuration...');
    const updatedUser = await auth.getUser(UID);
    console.log('   New Claims:', JSON.stringify(updatedUser.customClaims));

    const userDoc = await firestore.collection('users').doc(UID).get();
    console.log('   User Doc Role:', userDoc.data()?.role);
    console.log('   Approval Status:', userDoc.data()?.approvalStatus);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ECSTATIC EDIBLES PILOT CONFIGURATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('📧 Email:', EMAIL);
    console.log('🆔 User UID:', UID);
    console.log('🏷️  Brand ID:', BRAND_ID);
    console.log('🏢 Org ID:', ORG_ID);
    console.log('🔗 Brand URL: https://bakedbot.ai/ecstaticedibles');
    console.log('🎨 Theme: Red (#DC2626), Black (#000000), White (#FFFFFF)');
    console.log('📦 Purchase Model: Online Only (Shipping)');
    console.log('💰 Plan: Pilot Partner (Free)');
    console.log('');
    console.log('⚠️  IMPORTANT: Clear browser data and sign in fresh!');
    console.log('   All existing tokens have been revoked.');
    console.log('='.repeat(60));
}

main().catch(console.error);
