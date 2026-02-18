/**
 * Seed The Herbalist Samui — International Pilot Customer
 * BakedBot's first international dispensary on Koh Samui Island, Thailand
 *
 * Setup includes:
 * - Organization + Brand + Tenant documents
 * - Firebase Auth user (herbalistsamui@bakedbot.ai)
 * - 22 demo products (Thai market pricing in THB)
 * - 4 local Koh Samui competitors
 * - Initial competitor snapshots for first intel report
 * - Playbook for competitive intelligence
 * - Invitations for 3 team members
 *
 * Run:
 * $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\firebase-key.json"
 * npx tsx scripts/seed-herbalist-samui.ts
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';

const ORG_ID = 'dispensary_herbalistsamui';
const ORG_SLUG = 'herbalistsamui';
const ADMIN_EMAIL = 'herbalistsamui@bakedbot.ai';
const ADMIN_PASSWORD = 'HerbalistSamui2024!TempPassword'; // Must be changed by user

// Invite recipients
const INVITEES = [
  { email: 'jack@bakedbot.ai', role: 'dispensary_admin' as const },
  { email: 'bryan@thebeachsamui.com', role: 'dispensary_admin' as const },
];

// Initialize Firebase Admin SDK
let initialized = false;
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    initialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  }
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin SDK');
  console.error('');
  console.error('Option 1 - Service Account Key (recommended):');
  console.error('  1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts');
  console.error('  2. Click the firebase-adminsdk-* service account');
  console.error('  3. Go to "Keys" tab → "Add Key" → "Create new key" → "JSON"');
  console.error('  4. Save the downloaded JSON file');
  console.error('  5. Run:');
  console.error('     $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\firebase-key.json"');
  console.error('     npx tsx scripts/seed-herbalist-samui.ts');
  console.error('');
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

/**
 * Demo products for Herbalist Samui (22 products, THB pricing)
 */
const DEMO_PRODUCTS = [
  // Flower (5)
  {
    name: 'Island OG 1g',
    category: 'Flower',
    price: 350,
    weight: 1,
    weightUnit: 'g' as const,
    thcPercent: 22,
    cbdPercent: 0.5,
    strainType: 'Indica',
    description: 'Heavy indica from local farms, deep relaxation',
  },
  {
    name: 'Mango Haze 1g',
    category: 'Flower',
    price: 380,
    weight: 1,
    weightUnit: 'g' as const,
    thcPercent: 20,
    cbdPercent: 0.3,
    strainType: 'Sativa',
    description: 'Tropical sativa, tourist favorite, uplifting',
  },
  {
    name: 'Thai Stick 1g',
    category: 'Flower',
    price: 320,
    weight: 1,
    weightUnit: 'g' as const,
    thcPercent: 18,
    cbdPercent: 0.2,
    strainType: 'Hybrid',
    description: 'Classic Thai landrace, smooth smoke',
  },
  {
    name: 'Blue Dream 3.5g',
    category: 'Flower',
    price: 1200,
    weight: 3.5,
    weightUnit: 'g' as const,
    thcPercent: 19,
    cbdPercent: 0.4,
    strainType: 'Hybrid',
    description: 'Popular hybrid, balanced effects',
  },
  {
    name: 'Wedding Cake 3.5g',
    category: 'Flower',
    price: 1500,
    weight: 3.5,
    weightUnit: 'g' as const,
    thcPercent: 25,
    cbdPercent: 0.5,
    strainType: 'Indica-Dominant',
    description: 'Premium indica-dominant, sweet vanilla notes',
  },

  // Pre-Rolls (4)
  {
    name: 'Island OG Pre-Roll',
    category: 'Pre-Roll',
    price: 150,
    weight: 0.8,
    weightUnit: 'g' as const,
    thcPercent: 22,
    cbdPercent: 0.5,
    strainType: 'Indica',
    description: 'Single pre-roll, slow-burn',
  },
  {
    name: 'Mango Haze Pre-Roll',
    category: 'Pre-Roll',
    price: 150,
    weight: 0.8,
    weightUnit: 'g' as const,
    thcPercent: 20,
    cbdPercent: 0.3,
    strainType: 'Sativa',
    description: 'Single pre-roll, daytime friendly',
  },
  {
    name: 'Thai Gold Joint',
    category: 'Pre-Roll',
    price: 120,
    weight: 0.7,
    weightUnit: 'g' as const,
    thcPercent: 16,
    cbdPercent: 0.2,
    strainType: 'Hybrid',
    description: 'Budget-friendly local blend',
  },
  {
    name: 'Infused Pre-Roll (Diamond)',
    category: 'Pre-Roll',
    price: 350,
    weight: 1,
    weightUnit: 'g' as const,
    thcPercent: 35,
    cbdPercent: 0,
    strainType: 'Hybrid',
    description: 'THCa diamond-infused, premium',
  },

  // Vaporizers (4)
  {
    name: 'Live Resin Cart (OG)',
    category: 'Vaporizers',
    price: 900,
    description: '510-thread, rich terpenes, Island OG flavor',
  },
  {
    name: 'Disposable Vape (Mango)',
    category: 'Vaporizers',
    price: 1100,
    description: '1g, no device needed, Mango Haze',
  },
  {
    name: 'CBD:THC 1:1 Cart',
    category: 'Vaporizers',
    price: 850,
    description: 'Balanced 1:1, wellness-focused',
  },
  {
    name: 'Sativa Pax Pod',
    category: 'Vaporizers',
    price: 1300,
    description: 'Pax-compatible pod, daytime sativa',
  },

  // Edibles (4)
  {
    name: 'Tropical Gummies (10pc)',
    category: 'Edibles',
    price: 400,
    servings: 10,
    mgPerServing: 10,
    description: 'Mango + passion fruit, 100mg total THC',
  },
  {
    name: 'Dark Chocolate Bar',
    category: 'Edibles',
    price: 450,
    servings: 10,
    mgPerServing: 10,
    description: 'Belgian dark, 100mg THC, 10 squares',
  },
  {
    name: 'CBD Wellness Gummies (20pc)',
    category: 'Edibles',
    price: 350,
    servings: 20,
    mgPerServing: 10,
    cbdPercent: 10,
    description: 'No THC, 200mg CBD, relaxation',
  },
  {
    name: 'Island Honey (1oz)',
    category: 'Edibles',
    price: 280,
    servings: 1,
    mgPerServing: 50,
    description: 'Stir into tea or coffee, 50mg THC',
  },

  // Wellness / Topicals (3)
  {
    name: 'CBD Massage Oil',
    category: 'Topicals',
    price: 650,
    description: '500mg CBD, coconut-based, muscle relief',
  },
  {
    name: 'Pain Relief Balm',
    category: 'Topicals',
    price: 520,
    description: '1000mg CBD+CBG, for arthritis and pain',
  },
  {
    name: 'CBD Tincture (30ml)',
    category: 'Topicals',
    price: 750,
    description: '1000mg full-spectrum, sublingual or food',
  },

  // Accessories (2)
  {
    name: 'Premium Rolling Papers',
    category: 'Accessories',
    price: 80,
    description: 'King-size organic hemp papers',
  },
  {
    name: 'Metal Herb Grinder',
    category: 'Accessories',
    price: 380,
    description: '4-piece anodized aluminum, carry case included',
  },
];

/**
 * Koh Samui Competitors
 */
const KOH_SAMUI_COMPETITORS = [
  {
    id: 'island-cannabis-co-samui',
    name: 'Island Cannabis Co.',
    primaryDomain: 'islandcannabiscosamui.com',
    distance: '0.8 km',
    notes: 'Chaweng Beach main strip — high tourist traffic',
    lat: 9.5400,
    lng: 100.0610,
  },
  {
    id: 'samui-herb-garden',
    name: 'Samui Herb Garden',
    primaryDomain: 'samuiherbgarden.com',
    distance: '4.2 km',
    notes: 'Lamai Beach area — focus on wellness',
    lat: 8.9870,
    lng: 100.0850,
  },
  {
    id: 'green-wave-samui',
    name: 'Green Wave Samui',
    primaryDomain: 'greenwavesamui.com',
    distance: '3.1 km',
    notes: "Fisherman's Village (Bo Phut) — upscale market",
    lat: 9.6500,
    lng: 100.0380,
  },
  {
    id: 'tropicanna-koh-samui',
    name: 'Tropicanna Koh Samui',
    primaryDomain: 'tropicannasamui.com',
    distance: '6.5 km',
    notes: 'Mae Nam area — budget pricing, high volume',
    lat: 9.5820,
    lng: 100.0170,
  },
];

async function seedHerbalistSamui() {
  try {
    console.log('[HerbalistSamui] Starting full setup...\n');

    // ============================================================
    // STEP 1: Create Firebase Auth user
    // ============================================================
    console.log('[Step 1] Creating Firebase Auth user...');
    let userId: string;
    try {
      const userRecord = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'Herbalist Samui Admin',
      });
      userId = userRecord.uid;
      console.log(`  ✅ User created: ${ADMIN_EMAIL} (UID: ${userId})`);
    } catch (err: any) {
      if (err.code === 'auth/email-already-exists') {
        console.log(`  ⚠️ User already exists: ${ADMIN_EMAIL}`);
        // Get the user to retrieve their UID
        const existingUser = await auth.getUserByEmail(ADMIN_EMAIL);
        userId = existingUser.uid;
      } else {
        throw err;
      }
    }

    // ============================================================
    // STEP 2: Create Organization document
    // ============================================================
    console.log('\n[Step 2] Creating organization document...');
    const organizationDoc = {
      id: ORG_ID,
      name: 'The Herbalist Samui',
      type: 'dispensary',
      ownerId: userId,
      slug: ORG_SLUG,
      website: 'https://herbalist-samui.com',
      phone: '+66 77 420 888',
      billing: {
        planId: 'empire',
        subscriptionStatus: 'active',
        tierId: 'empire',
      },
      settings: {
        timezone: 'Asia/Bangkok',
        currency: 'THB',
        policyPack: 'relaxed',
        allowOverrides: true,
        hipaaMode: false,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('organizations').doc(ORG_ID).set(organizationDoc, { merge: true });
    console.log(`  ✅ Organization created: ${ORG_ID}`);

    // ============================================================
    // STEP 3: Create Brand document (for bakedbot.ai/herbalistsamui routing)
    // ============================================================
    console.log('\n[Step 3] Creating brand document...');
    const brandDoc = {
      id: ORG_ID,
      name: 'The Herbalist Samui',
      slug: ORG_SLUG,
      type: 'dispensary',
      menuDesign: 'dispensary',
      description: 'Premium cannabis dispensary on Koh Samui Island, Thailand. Premium selection, local expertise.',
      website: 'https://herbalist-samui.com',
      phone: '+66 77 420 888',
      location: {
        address: 'Chaweng Beach Road, Koh Samui',
        city: 'Koh Samui',
        state: 'Surat Thani',
        country: 'Thailand',
        zip: '84320',
      },
      coordinates: {
        lat: 9.5391,
        lng: 100.0603,
      },
      theme: {
        primaryColor: '#2d6a4f',
        secondaryColor: '#1b4332',
        accentColor: '#95d5b2',
      },
      purchaseModel: 'direct',
      chatbotConfig: {
        enabled: true,
        persona: 'smokey',
      },
      hours: {
        monday: '10:00-22:00',
        tuesday: '10:00-22:00',
        wednesday: '10:00-22:00',
        thursday: '10:00-22:00',
        friday: '10:00-22:00',
        saturday: '10:00-22:00',
        sunday: '10:00-22:00',
      },
      planId: 'empire',
      currency: 'THB',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('brands').doc(ORG_ID).set(brandDoc, { merge: true });
    console.log(`  ✅ Brand created: ${ORG_SLUG} → bakedbot.ai/${ORG_SLUG}`);

    // ============================================================
    // STEP 4: Create Tenant document (for competitive intel + billing)
    // ============================================================
    console.log('\n[Step 4] Creating tenant document...');
    const tenantDoc = {
      id: ORG_ID,
      name: 'The Herbalist Samui',
      type: 'dispensary',
      email: ADMIN_EMAIL,
      website: 'https://herbalist-samui.com',
      planId: 'empire',
      subscriptionStatus: 'active',
      settings: {
        timezone: 'Asia/Bangkok',
        currency: 'THB',
        defaultLocationId: 'loc_herbalistsamui_main',
      },
      channels: {
        headlessMenu: true,
        smokeyAgent: true,
        craigCampaigns: true,
        deeboCompliance: false,
        ezalCompetitiveIntel: true,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('tenants').doc(ORG_ID).set(tenantDoc, { merge: true });
    console.log(`  ✅ Tenant created: ${ORG_ID}`);

    // ============================================================
    // STEP 5: Create Location document
    // ============================================================
    console.log('\n[Step 5] Creating location document...');
    const locationId = 'loc_herbalistsamui_main';
    const locationDoc = {
      orgId: ORG_ID,
      name: 'Herbalist Samui - Main',
      address: 'Chaweng Beach Road',
      city: 'Koh Samui',
      state: 'Surat Thani',
      country: 'Thailand',
      zip: '84320',
      isActive: true,
      posConfig: {
        provider: 'none',
        status: 'not_connected',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('locations').doc(locationId).set(locationDoc);
    console.log(`  ✅ Location created: ${locationId}`);

    // ============================================================
    // STEP 6: Create Firestore users document
    // ============================================================
    console.log('\n[Step 6] Creating users document...');
    const userDoc = {
      uid: userId,
      email: ADMIN_EMAIL,
      displayName: 'Herbalist Samui Admin',
      role: 'dispensary_admin',
      organizationIds: [ORG_ID],
      currentOrgId: ORG_ID,
      orgMemberships: {
        [ORG_ID]: {
          orgId: ORG_ID,
          orgName: 'The Herbalist Samui',
          orgType: 'dispensary',
          role: 'dispensary_admin',
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      approvalStatus: 'approved',
      planId: 'empire',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userId).set(userDoc, { merge: true });

    // Set Firebase custom claims
    await auth.setCustomUserClaims(userId, {
      role: 'dispensary_admin',
      orgId: ORG_ID,
      currentOrgId: ORG_ID,
      planId: 'empire',
    });
    console.log(`  ✅ User document created and custom claims set`);

    // ============================================================
    // STEP 7: Seed Demo Products (22 products, THB pricing)
    // ============================================================
    console.log('\n[Step 7] Seeding demo products...');
    let productCount = 0;
    for (const product of DEMO_PRODUCTS) {
      const productId = `prod_herbalistsamui_${product.name.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')}`;
      const productDoc = {
        id: productId,
        name: product.name,
        category: product.category,
        price: product.price,
        brandId: ORG_ID,
        brandName: 'The Herbalist Samui',
        description: product.description || product.name,
        imageUrl:
          'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=600',
        inStock: true,
        source: 'pilot_setup',
        currency: 'THB',
        ...(product.weight && { weight: product.weight }),
        ...(product.weightUnit && { weightUnit: product.weightUnit }),
        ...(product.thcPercent && { thcPercent: product.thcPercent }),
        ...(product.cbdPercent && { cbdPercent: product.cbdPercent }),
        ...(product.strainType && { strainType: product.strainType }),
        ...(product.servings && { servings: product.servings }),
        ...(product.mgPerServing && { mgPerServing: product.mgPerServing }),
        featured: false,
        sortOrder: productCount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('products').doc(productId).set(productDoc);
      productCount++;
    }
    console.log(`  ✅ ${productCount} products seeded`);

    // ============================================================
    // STEP 8: Seed Competitors
    // ============================================================
    console.log('\n[Step 8] Seeding competitors...');
    let competitorCount = 0;
    for (const competitor of KOH_SAMUI_COMPETITORS) {
      const competitorDoc = {
        id: competitor.id,
        tenantId: ORG_ID,
        name: competitor.name,
        type: 'dispensary',
        primaryDomain: competitor.primaryDomain,
        city: 'Koh Samui',
        state: 'Surat Thani',
        zip: '84320',
        brandsFocus: [],
        active: true,
        scrapingEnabled: true,
        consecutiveFailures: 0,
        lastScraped: null,
        weedmapsSlug: competitor.id.replace(/-/g, ''),
        metadata: {
          distance: competitor.distance,
          notes: competitor.notes,
        },
        lat: competitor.lat,
        lng: competitor.lng,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db
        .collection('tenants')
        .doc(ORG_ID)
        .collection('competitors')
        .doc(competitor.id)
        .set(competitorDoc);
      competitorCount++;
    }
    console.log(`  ✅ ${competitorCount} competitors seeded`);

    // ============================================================
    // STEP 9: Seed Initial Competitor Snapshots
    // ============================================================
    console.log('\n[Step 9] Seeding initial competitor snapshots...');
    const snapshotProducts = [
      { name: 'Island OG 1g', price: 380, category: 'Flower' },
      { name: 'Mango Haze 1g', price: 400, category: 'Flower' },
      { name: 'Blue Dream 3.5g', price: 1300, category: 'Flower' },
      { name: 'Thai Stick Pre-Roll', price: 140, category: 'Pre-Roll' },
      { name: 'Live Resin Cart', price: 950, category: 'Vape' },
    ];

    let snapshotCount = 0;
    for (const competitor of KOH_SAMUI_COMPETITORS) {
      const snapshotId = `${Date.now()}_${competitor.id}`;
      const snapshotDoc = {
        orgId: ORG_ID,
        competitorId: competitor.id,
        competitorName: competitor.name,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
        sourceUrl: `https://${competitor.primaryDomain}`,
        deals: snapshotProducts.map((p) => ({
          name: p.name,
          price: p.price,
          category: p.category,
        })),
        products: snapshotProducts.map((p) => ({
          name: p.name,
          price: p.price,
          category: p.category,
          inStock: true,
        })),
        avgDealPrice: Math.round(snapshotProducts.reduce((sum, p) => sum + p.price, 0) / snapshotProducts.length),
        dealCount: snapshotProducts.length,
        productCount: snapshotProducts.length,
      };

      await db
        .collection('tenants')
        .doc(ORG_ID)
        .collection('competitor_snapshots')
        .doc(snapshotId)
        .set(snapshotDoc);
      snapshotCount++;
    }
    console.log(`  ✅ ${snapshotCount} initial snapshots seeded`);

    // ============================================================
    // STEP 10: Create Competitive Intelligence Playbook
    // ============================================================
    console.log('\n[Step 10] Creating competitive intel playbook...');
    const playbookId = `playbook_${ORG_SLUG}_competitive_intel`;
    const playbookDoc = {
      id: playbookId,
      name: 'Competitive Intelligence Report',
      description: 'Weekly competitive intelligence analysis for Koh Samui market',
      status: 'active',
      agent: 'ezal',
      category: 'intelligence',
      icon: 'Eye',
      orgId: ORG_ID,
      templateId: 'competitive_intel_template',
      triggers: [
        {
          type: 'schedule',
          cron: '0 8 * * 1', // Monday 8 AM Bangkok time
          timezone: 'Asia/Bangkok',
          enabled: true,
        },
        {
          type: 'event',
          eventName: 'manual.competitive.scan',
          enabled: true,
        },
      ],
      steps: [
        {
          action: 'ezal_pipeline',
          params: {
            query: 'Koh Samui cannabis dispensaries',
            maxUrls: 20,
          },
        },
        {
          action: 'analyze',
          params: {
            agent: 'ezal',
            compareWithOwnPrices: true,
          },
        },
        {
          action: 'save_to_dashboard',
          params: {
            collection: 'competitive_intel_reports',
          },
        },
      ],
      metadata: {
        brandName: 'The Herbalist Samui',
        brandType: 'dispensary',
        city: 'Koh Samui',
        state: 'Surat Thani',
        searchQuery: 'Koh Samui cannabis dispensaries',
      },
      requiresApproval: false,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      version: 1,
      ownerId: 'system',
      createdBy: 'pilot_setup',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('playbooks').doc(playbookId).set(playbookDoc);
    console.log(`  ✅ Playbook created: ${playbookId}`);

    // ============================================================
    // STEP 11: Create Invitations for Team Members
    // ============================================================
    console.log('\n[Step 11] Creating invitations for team members...');

    // Skip the herbalistsamui@bakedbot.ai user (already created above)
    for (const invitee of INVITEES) {
      const invitationId = uuidv4();
      const token = `${uuidv4()}${uuidv4()}`.replace(/-/g, '');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const invitationDoc = {
        id: invitationId,
        email: invitee.email,
        role: invitee.role,
        targetOrgId: ORG_ID,
        invitedBy: userId,
        status: 'pending',
        token,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: expiresAt,
      };

      await db.collection('invitations').doc(invitationId).set(invitationDoc);

      const inviteLink = `https://bakedbot.ai/join/${token}`;
      console.log(`  ✅ Invitation created: ${invitee.email}`);
      console.log(`     Link: ${inviteLink}\n`);
    }

    // ============================================================
    // FINAL SUCCESS MESSAGE
    // ============================================================
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ THE HERBALIST SAMUI — SETUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 Setup Summary:');
    console.log(`  ✅ Organization: ${ORG_ID}`);
    console.log(`  ✅ Brand/Menu: bakedbot.ai/${ORG_SLUG}`);
    console.log(`  ✅ Admin: ${ADMIN_EMAIL}`);
    console.log(`  ✅ Plan: empire (unlimited)`);
    console.log(`  ✅ Currency: THB (฿)`);
    console.log(`  ✅ Timezone: Asia/Bangkok`);
    console.log(`  ✅ Products: ${productCount} (demo menu)`);
    console.log(`  ✅ Competitors: ${competitorCount} (Koh Samui)`);
    console.log(`  ✅ Initial Snapshots: ${snapshotCount}`);
    console.log(`  ✅ Playbook: Competitive Intelligence`);
    console.log(`  ✅ Team Invitations: ${INVITEES.length}`);

    console.log('\n🎯 Next Steps:');
    console.log('  1. Visit: https://bakedbot.ai/herbalistsamui (after deploy)');
    console.log('  2. Verify menu with 22 products in THB');
    console.log('  3. Run competitive intel cron:');
    console.log(`     curl -X POST https://bakedbot.ai/api/cron/competitive-intel \\`);
    console.log(`       -H "Authorization: Bearer \\$CRON_SECRET" \\`);
    console.log(`       -d '{"orgId":"${ORG_ID}"}'`);
    console.log('  4. Check invitations sent to team members');
    console.log('  5. Create Cloud Scheduler job for daily intel');
    console.log('\n📧 Invitations sent to:');
    INVITEES.forEach((inv) => console.log(`  • ${inv.email} (${inv.role})`));
    console.log(`  • ${ADMIN_EMAIL} (dispensary_admin) — already created`);

    console.log('\n⚠️ IMPORTANT:');
    console.log(`  Temp password: ${ADMIN_PASSWORD}`);
    console.log('  User must change password on first login!');
    console.log('\n═══════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('[HerbalistSamui] Seed failed', { error });
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run the seed
seedHerbalistSamui();
