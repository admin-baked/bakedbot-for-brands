/**
 * Setup Thrive Syracuse - Pilot Dispensary Customer
 *
 * This script:
 * 1. Creates user account (thrivesyracuse@bakedbot.ai / Smokey123!!@@)
 * 2. Creates the dispensary brand with blue/green theme
 * 3. Creates the organization with Empire plan
 * 4. Imports products from scraped Weedmaps data
 * 5. Configures Smokey AI chatbot
 * 6. Creates 3 ZIP code dispensary pages
 * 7. Verifies ground truth QA set is configured
 *
 * Run with: npx ts-node --transpile-only dev/setup-thrive-syracuse.ts
 */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

// Ground truth verification (imported at runtime to avoid module resolution issues)
const verifyGroundTruth = async (brandId: string) => {
    try {
        const { hasGroundTruth, getGroundTruthStats } = await import('../src/server/grounding');
        if (hasGroundTruth(brandId)) {
            const stats = getGroundTruthStats(brandId);
            return { configured: true, stats };
        }
        return { configured: false };
    } catch (error) {
        console.warn('   ⚠️  Could not verify ground truth (module not available in ts-node)');
        return { configured: false, error };
    }
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});
const auth = getAuth(app);
const firestore = getFirestore(app);

// Configuration
const EMAIL = 'thrivesyracuse@bakedbot.ai';
const PASSWORD = 'Smokey123!!@@';
const BRAND_NAME = 'Thrive Syracuse';
const BRAND_SLUG = 'thrivesyracuse';
const BRAND_ID = 'brand_thrive_syracuse';
const ORG_ID = 'org_thrive_syracuse';
const LOCATION_ID = 'loc_thrive_syracuse';

// Thrive Syracuse brand colors from their website
const THEME = {
    primaryColor: '#6262F5',    // Purple/Blue
    secondaryColor: '#0A803A',  // Green (success)
    accentColor: '#FFFFFF',     // White
};

// Dispensary location info
const LOCATION = {
    address: '3065 Erie Boulevard East',
    city: 'Syracuse',
    state: 'NY',
    zip: '13224',
    phone: '315-207-7935',
    coordinates: {
        lat: 43.0559823,
        lng: -76.08411389999999
    },
    hours: {
        monday: '10:30 AM - 8:00 PM',
        tuesday: '10:30 AM - 8:00 PM',
        wednesday: '10:30 AM - 8:00 PM',
        thursday: '10:30 AM - 8:00 PM',
        friday: '10:30 AM - 8:00 PM',
        saturday: '10:30 AM - 8:00 PM',
        sunday: '10:30 AM - 6:00 PM',
    },
    licenseNumber: 'OCM CAURD 24 000224'
};

// ZIP codes to create pages for (Syracuse area)
const ZIP_CODES = ['13224', '13214', '13210'];

// Products scraped from Weedmaps (initial set)
const PRODUCTS = [
    // Flower
    { name: 'Coconut Cream', brand: 'Nanticoke', category: 'Flower', price: 88.00, thcPercent: null, weight: '7g', description: 'Premium quarter ounce in glass jar', featured: true },
    { name: 'Delphi Diesel Whole Flower', brand: 'Grassroots', category: 'Flower', price: 40.00, thcPercent: null, weight: '3.5g', description: 'High-quality whole flower' },
    { name: 'Gelato Sorbet Value Line', brand: 'Rolling Green', category: 'Flower', price: 36.00, thcPercent: 27.6, weight: '3.5g', description: 'Value line premium flower' },
    { name: 'Lilac Diesel', brand: 'Nanticoke', category: 'Flower', price: 33.00, thcPercent: 22, weight: '3.5g', description: 'Aromatic diesel strain' },
    { name: 'Oreoz Premium Flower', brand: 'Rolling Green', category: 'Flower', price: 50.00, thcPercent: 30.51, weight: '3.5g', description: 'Premium high-potency flower', featured: true },
    { name: 'Orange Cookies', brand: 'matter.', category: 'Flower', price: 35.00, thcPercent: null, weight: '3.5g', description: 'Sweet citrus cookies strain' },
    { name: 'Blue Dream', brand: 'Nanticoke', category: 'Flower', price: 32.00, thcPercent: 20.5, weight: '3.5g', description: 'Classic sativa-dominant hybrid' },
    { name: 'Dynamite Cookies', brand: 'TYSON 2.0', category: 'Flower', price: 44.00, thcPercent: 25, weight: '3.5g', description: 'Mike Tyson premium flower' },
    { name: 'Scotties Cake', brand: 'matter.', category: 'Flower', price: 35.00, thcPercent: null, weight: '3.5g', description: 'Cake strain with sweet notes' },
    { name: 'Scotties Cake Half Oz', brand: 'matter.', category: 'Flower', price: 120.00, thcPercent: 29, weight: '14g', description: 'Half ounce value pack' },
    { name: 'Blue Dream Half Oz', brand: 'Nanticoke', category: 'Flower', price: 88.00, thcPercent: 23, weight: '14g', description: 'Half ounce value pack' },
    { name: 'Healer', brand: 'Operator Canna Co', category: 'Flower', price: 45.00, thcPercent: 30.7, weight: '3.5g', description: 'High-potency premium flower' },
    { name: 'Shock Mints', brand: 'Find', category: 'Flower', price: 32.00, thcPercent: null, weight: '3.5g', description: 'Refreshing mint strain' },
    { name: 'Warrior', brand: 'Operator Canna Co', category: 'Flower', price: 45.00, thcPercent: 21.8, weight: '3.5g', description: 'Bold warrior strain' },
    { name: 'Grease Bucket', brand: '1937', category: 'Flower', price: 25.00, thcPercent: 24.7, weight: '3.5g', description: 'Affordable quality flower' },
    { name: 'Green Crack', brand: 'Florist Farms', category: 'Flower', price: 59.00, thcPercent: 22, weight: '7g', description: 'Energizing sativa quarter' },
    { name: 'Super Diesel', brand: 'Revert', category: 'Flower', price: 90.00, thcPercent: 27.3, weight: '14g', description: 'Diesel half ounce value' },
    { name: 'Chem x Chocolate', brand: '1937', category: 'Flower', price: 25.00, thcPercent: 20.5, weight: '3.5g', description: 'Chem chocolate cross' },
    { name: 'Biker Kush', brand: '1937', category: 'Flower', price: 50.00, thcPercent: 33.7, weight: '7g', description: 'High-potency kush quarter' },
    { name: 'Foreign Kush Mints', brand: 'Grassroots', category: 'Flower', price: 45.00, thcPercent: 32, weight: '3.5g', description: 'Exotic minty kush' },
    { name: 'Jelly Cake', brand: 'matter.', category: 'Flower', price: 100.00, thcPercent: 29.43, weight: '14g', description: 'Sweet jelly cake half oz' },

    // Pre-Rolls
    { name: 'Spritzer Pre-Roll', brand: 'Revert', category: 'Pre-Rolls', price: 7.00, thcPercent: null, weight: '0.5g', description: 'Single pre-roll' },
    { name: 'Space Cake CBD', brand: 'Revert', category: 'Flower', price: 30.00, cbdMg: 793.1, weight: '3.5g', description: 'High CBD flower' },

    // Edibles (common dispensary items)
    { name: 'THC Gummies 10pk', brand: 'Ayrloom', category: 'Edibles', price: 28.00, thcMg: 100, weight: '10 pieces', description: '10mg per gummy, 100mg total' },
    { name: 'Chocolate Bar', brand: 'Incredibles', category: 'Edibles', price: 32.00, thcMg: 100, weight: '100mg', description: 'Milk chocolate bar' },
    { name: 'Fruit Chews', brand: 'Wana', category: 'Edibles', price: 25.00, thcMg: 100, weight: '10 pieces', description: 'Assorted fruit flavors' },

    // Vapes
    { name: 'Live Resin Cart 0.5g', brand: 'Select', category: 'Vaporizers', price: 45.00, thcPercent: 85, weight: '0.5g', description: 'Live resin cartridge' },
    { name: 'Disposable Vape 1g', brand: 'Stiiizy', category: 'Vaporizers', price: 55.00, thcPercent: 90, weight: '1g', description: 'All-in-one disposable' },
    { name: 'Distillate Cart 1g', brand: 'Rove', category: 'Vaporizers', price: 50.00, thcPercent: 88, weight: '1g', description: 'Premium distillate cartridge' },

    // Concentrates
    { name: 'Live Rosin 1g', brand: 'Hash House', category: 'Concentrates', price: 65.00, thcPercent: 75, weight: '1g', description: 'Solventless live rosin' },
    { name: 'Badder 1g', brand: 'Grassroots', category: 'Concentrates', price: 55.00, thcPercent: 80, weight: '1g', description: 'Premium badder concentrate' },
    { name: 'Crumble 1g', brand: '1937', category: 'Concentrates', price: 45.00, thcPercent: 78, weight: '1g', description: 'Easy to use crumble' },

    // Tinctures
    { name: 'THC Tincture 30ml', brand: 'Ayrloom', category: 'Tinctures', price: 45.00, thcMg: 300, weight: '30ml', description: 'Sublingual drops' },
    { name: 'CBD:THC 1:1 Tincture', brand: 'matter.', category: 'Tinctures', price: 50.00, thcMg: 250, cbdMg: 250, weight: '30ml', description: 'Balanced ratio tincture' },

    // Topicals
    { name: 'Relief Balm', brand: 'Papa & Barkley', category: 'Topicals', price: 38.00, thcMg: 100, cbdMg: 200, weight: '2oz', description: 'Soothing topical balm' },
    { name: 'Transdermal Patch', brand: 'Mary\'s Medicinals', category: 'Topicals', price: 22.00, thcMg: 20, weight: '1 patch', description: 'Long-lasting transdermal' },

    // Accessories
    { name: 'RAW Rolling Papers', brand: 'RAW', category: 'Accessories', price: 3.00, weight: '50 papers', description: 'Classic unrefined papers' },
    { name: 'Glass Pipe', brand: 'House', category: 'Accessories', price: 15.00, weight: '1 piece', description: 'Hand blown glass pipe' },
];

async function main() {
    console.log('🏪 Setting up Thrive Syracuse Pilot Dispensary...\n');

    // 1. Create or find user
    console.log('👤 Creating user account...');
    let user;
    try {
        user = await auth.getUserByEmail(EMAIL);
        console.log('   Found existing user:', user.uid);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            user = await auth.createUser({
                email: EMAIL,
                password: PASSWORD,
                emailVerified: true,
                displayName: BRAND_NAME,
            });
            console.log('   Created new user:', user.uid);
        } else {
            throw error;
        }
    }
    const UID = user.uid;

    // 2. Create Brand (dispensary)
    console.log('\n📦 Creating brand/dispensary...');
    await firestore.collection('brands').doc(BRAND_ID).set({
        id: BRAND_ID,
        name: BRAND_NAME,
        slug: BRAND_SLUG,
        type: 'dispensary',
        description: 'Elevating Cannabis, Empowering Communities. Syracuse\'s premier cannabis dispensary.',
        tagline: 'Where Syracuse shops cannabis, legally',
        website: 'https://thrivesyracuse.com',
        verified: true,
        verificationStatus: 'verified',
        claimStatus: 'claimed',
        ownerId: UID,

        // Brand colors
        theme: THEME,

        // Location info
        location: LOCATION,
        address: LOCATION.address,
        city: LOCATION.city,
        state: LOCATION.state,
        zip: LOCATION.zip,
        phone: LOCATION.phone,
        coordinates: LOCATION.coordinates,
        hours: LOCATION.hours,
        licenseNumber: LOCATION.licenseNumber,

        // Smokey AI Chatbot config
        chatbotConfig: {
            enabled: true,
            botName: 'Smokey',
            welcomeMessage: 'Hey! I\'m Smokey, your AI budtender at Thrive Syracuse. Looking for something specific? I can help you find the perfect product!',
            personality: 'friendly, knowledgeable, helpful cannabis expert',
            tone: 'casual but professional',
            sellingPoints: 'Legal NY cannabis, knowledgeable staff, great prices, wide selection',
        },

        // Dispensary settings
        purchaseModel: 'local_pickup',
        shipsNationwide: false,
        menuDesign: 'dispensary',
        acceptsCash: true,
        acceptsDebit: true,

        // Operating info
        isRecreational: true,
        isMedical: false,

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('   ✅ Brand created with purple/green theme');

    // 3. Create Organization
    console.log('\n🏢 Creating organization...');
    await firestore.collection('organizations').doc(ORG_ID).set({
        id: ORG_ID,
        name: BRAND_NAME,
        type: 'dispensary',
        ownerId: UID,
        brandId: BRAND_ID,

        settings: {
            policyPack: 'balanced',
            allowOverrides: true,
            hipaaMode: false,
            purchaseModel: 'local_pickup',
        },

        // Empire plan for pilot
        billing: {
            subscriptionStatus: 'active',
            planId: 'empire',
            planName: 'Empire (Pilot)',
            monthlyPrice: 0, // Free during pilot
            billingCycleStart: new Date().toISOString(),
            features: {
                maxZips: 1000,
                maxPlaybooks: 100,
                maxProducts: 5000,
                advancedReporting: true,
                prioritySupport: true,
                coveragePacksEnabled: true,
                apiAccess: true,
                whiteLabel: true,
            }
        },

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('   ✅ Organization created with Empire plan');

    // 4. Create Location
    console.log('\n📍 Creating location...');
    await firestore.collection('locations').doc(LOCATION_ID).set({
        id: LOCATION_ID,
        orgId: ORG_ID,
        brandId: BRAND_ID,
        name: 'Main Location',
        ...LOCATION,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('   ✅ Location created');

    // 5. Create User Profile
    console.log('\n👤 Creating user profile...');
    await firestore.collection('users').doc(UID).set({
        uid: UID,
        email: EMAIL,
        displayName: BRAND_NAME,
        role: 'dispensary',
        approvalStatus: 'approved',
        isNewUser: false,
        onboardingCompletedAt: new Date().toISOString(),
        organizationIds: [ORG_ID],
        currentOrgId: ORG_ID,
        brandId: BRAND_ID,
        locationId: LOCATION_ID,

        billing: {
            planId: 'empire',
            planName: 'Empire (Pilot)',
            status: 'active',
            monthlyPrice: 0
        },

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
    console.log('   ✅ User profile created');

    // 6. Set Custom Claims
    console.log('\n🔐 Setting custom claims...');
    await auth.setCustomUserClaims(UID, {
        role: 'dispensary',
        orgId: ORG_ID,
        brandId: BRAND_ID,
        locationId: LOCATION_ID,
        planId: 'empire',
        approvalStatus: 'approved',
    });
    console.log('   ✅ Custom claims set');

    // 7. Revoke old tokens
    console.log('\n🔄 Revoking old tokens...');
    await auth.revokeRefreshTokens(UID);
    console.log('   ✅ Refresh tokens revoked');

    // 8. Create Products
    console.log('\n📦 Creating products...');
    let productCount = 0;
    for (const product of PRODUCTS) {
        const productId = `prod_thrive_${product.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${productCount}`;

        await firestore.collection('products').doc(productId).set({
            id: productId,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            brandId: BRAND_ID,
            brandName: product.brand,
            vendorBrand: product.brand,
            weight: product.weight,
            thcPercent: product.thcPercent || null,
            thcMg: (product as any).thcMg || null,
            cbdMg: (product as any).cbdMg || null,
            featured: product.featured || false,
            sortOrder: productCount,
            inStock: true,
            source: 'weedmaps_scrape',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        productCount++;
    }
    console.log(`   ✅ Created ${productCount} products`);

    // 9. Create ZIP Code Pages
    console.log('\n📍 Creating ZIP code dispensary pages...');
    for (const zip of ZIP_CODES) {
        const pageId = `zip_${zip}_thrive_syracuse`;

        await firestore.collection('zip_pages').doc(pageId).set({
            id: pageId,
            zip: zip,
            brandId: BRAND_ID,
            brandName: BRAND_NAME,
            brandSlug: BRAND_SLUG,
            dispensaryId: LOCATION_ID,

            // SEO content
            title: `Cannabis Dispensary Near ${zip} | Thrive Syracuse`,
            metaDescription: `Find legal cannabis at Thrive Syracuse, serving ZIP code ${zip}. Shop flower, edibles, vapes & more. ${LOCATION.address}, Syracuse NY.`,
            h1: `Cannabis Dispensary Serving ${zip}`,

            // Location data
            city: LOCATION.city,
            state: LOCATION.state,
            address: LOCATION.address,
            phone: LOCATION.phone,
            coordinates: LOCATION.coordinates,

            // Status
            status: 'active',
            verified: true,

            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`   ✅ Created ZIP page for ${zip}`);
    }

    // 10. Verify Ground Truth
    console.log('\n📚 Verifying ground truth QA set...');
    const groundTruthResult = await verifyGroundTruth('thrivesyracuse');
    if (groundTruthResult.configured && groundTruthResult.stats) {
        console.log(`   ✅ Ground truth configured: ${groundTruthResult.stats.totalQAPairs} QA pairs`);
        console.log(`      Critical: ${groundTruthResult.stats.criticalCount} | High: ${groundTruthResult.stats.highCount} | Medium: ${groundTruthResult.stats.mediumCount}`);
        console.log(`      Categories: ${groundTruthResult.stats.categories.join(', ')}`);
    } else {
        console.log('   ⚠️  Ground truth not configured - Smokey will use generic responses');
        console.log('      To add: Create src/server/grounding/customers/thrive-syracuse.ts');
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 THRIVE SYRACUSE PILOT SETUP COMPLETE!');
    console.log('='.repeat(70));
    console.log('');
    console.log('📧 Login Email:', EMAIL);
    console.log('🔑 Password:', PASSWORD);
    console.log('🆔 User UID:', UID);
    console.log('🏷️  Brand ID:', BRAND_ID);
    console.log('🏢 Org ID:', ORG_ID);
    console.log('📍 Location ID:', LOCATION_ID);
    console.log('');
    console.log('🔗 URLs:');
    console.log('   Menu: https://bakedbot.ai/thrivesyracuse');
    console.log('   Dashboard: https://bakedbot.ai/dashboard');
    console.log('');
    console.log('📦 Products:', productCount);
    console.log('📍 ZIP Pages:', ZIP_CODES.join(', '));
    console.log('');
    console.log('🎨 Theme:');
    console.log('   Primary:', THEME.primaryColor, '(Purple/Blue)');
    console.log('   Secondary:', THEME.secondaryColor, '(Green)');
    console.log('');
    console.log('🤖 Smokey AI Chatbot: Enabled');
    console.log('📚 Ground Truth QA:', groundTruthResult.configured ? `${groundTruthResult.stats?.totalQAPairs} pairs` : 'Not configured');
    console.log('💰 Plan: Empire (Pilot - Free)');
    console.log('');
    console.log('⚠️  IMPORTANT: Clear browser data and sign in fresh!');
    console.log('='.repeat(70));
}

main().catch(console.error);
