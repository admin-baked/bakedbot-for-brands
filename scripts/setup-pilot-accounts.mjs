#!/usr/bin/env node

/**
 * setup-pilot-accounts.mjs — Pilot Account Setup
 *
 * Creates full pilot accounts for Simply Pure Trenton (NJ) and
 * Lakeshore Cannabis Club (IL) with:
 *   - Firebase Auth users (email + password)
 *   - Organization documents (tenants + organizations)
 *   - Brand config with brand colors
 *   - Default playbook assignments
 *   - Competitive intel configuration
 *
 * Usage:
 *   node scripts/setup-pilot-accounts.mjs              # dry-run
 *   node scripts/setup-pilot-accounts.mjs --apply      # write to Firestore + Auth
 *   node scripts/setup-pilot-accounts.mjs --org=simplypuretrenton --apply
 *
 * Logins:
 *   simplypuretrenton@bakedbot.ai  /  Smokey!!@@
 *   lakeshorecannabis@bakedbot.ai  /  Smokey!!@@
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// =============================================================================
// ENV LOADING
// =============================================================================

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach((line) => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eqIdx = line.indexOf('=');
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim();
            if (key && !process.env[key]) process.env[key] = value;
        }
    });
}

// =============================================================================
// FIREBASE INIT
// =============================================================================

if (getApps().length === 0) {
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!saKey) {
        console.error('ERROR: FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
        process.exit(1);
    }
    const serviceAccount = JSON.parse(Buffer.from(saKey, 'base64').toString('utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const auth = getAuth();

// =============================================================================
// PILOT ACCOUNT DEFINITIONS
// =============================================================================

const PILOTS = [
    {
        // Simply Pure Trenton — NJ social equity dispensary
        slug: 'simplypuretrenton',
        name: 'Simply Pure Trenton',
        email: 'simplypuretrenton@bakedbot.ai',
        password: 'Smokey!!@@',
        address: '1531 N Olden Avenue Ext, Trenton, NJ 08638',
        city: 'Trenton',
        state: 'NJ',
        zip: '08638',
        phone: '(609) 388-7679',
        hours: {
            monday:    { open: '09:00', close: '22:00' },
            tuesday:   { open: '09:00', close: '22:00' },
            wednesday: { open: '09:00', close: '22:00' },
            thursday:  { open: '09:00', close: '22:00' },
            friday:    { open: '09:00', close: '22:00' },
            saturday:  { open: '09:00', close: '22:00' },
            sunday:    { open: '09:00', close: '22:00' },
        },
        planId: 'grow',
        orgType: 'dispensary',
        posSystem: null,
        website: 'https://simplypuretrenton.com',
        loyaltyProgram: 'Pure Privilege',
        // Brand identity
        brandColors: {
            primary: '#d56627',    // Burnt orange
            secondary: '#291733',  // Dark purple
            accent: '#f5f0eb',     // Warm off-white
            text: '#291733',
            background: '#ffffff',
        },
        brandVoice: 'Warm, community-driven, proud of our social equity roots, educational and welcoming.',
        tagline: 'Discover Top-Quality Cannabis in the Trenton, NJ area.',
        marketContext: 'NJ Adult-Use | Social Equity Market',
        competitorSearchRadius: 10, // miles
        // Menu categories to seed (with representative products)
        menuSeed: [
            { category: 'Flower',    name: 'Green Joy 3.5g',         price: 22,  size: '3.5g' },
            { category: 'Flower',    name: 'Green Joy 4.5g Jar',     price: 28,  size: '4.5g' },
            { category: 'Flower',    name: 'Top-Shelf OG Kush 3.5g', price: 45,  size: '3.5g' },
            { category: 'Pre-Roll',  name: 'House Pre-Roll 1g',      price: 8,   size: '1g'   },
            { category: 'Pre-Roll',  name: 'Premium Pre-Roll 1g',    price: 14,  size: '1g'   },
            { category: 'Vape',      name: 'Fernway Cartridge .5g',  price: 38,  size: '0.5g' },
            { category: 'Vape',      name: 'Fernway Cartridge 1g',   price: 55,  size: '1g'   },
            { category: 'Edible',    name: 'Gummies 100mg 20ct',     price: 22,  size: '100mg' },
            { category: 'Edible',    name: 'Chocolate Bar 100mg',    price: 18,  size: '100mg' },
            { category: 'Concentrate', name: 'Live Resin 1g',        price: 55,  size: '1g'   },
            { category: 'Tincture',  name: 'CBD:THC 1:1 Tincture',  price: 45,  size: '30ml' },
            { category: 'Topical',   name: 'Relief Balm 1oz',       price: 30,  size: '1oz'  },
        ],
    },
    {
        // Lakeshore Cannabis Club — IL dispensary in Romeoville / Will County
        slug: 'lakeshorecannabis',
        name: 'Lakeshore Cannabis Club',
        email: 'lakeshorecannabis@bakedbot.ai',
        password: 'Smokey!!@@',
        address: '1335 Lakeside Dr Unit 4, Romeoville, IL 60446',
        city: 'Romeoville',
        state: 'IL',
        zip: '60446',
        phone: '(630) 755-4176',
        hours: {
            monday:    { open: '09:00', close: '21:00' },
            tuesday:   { open: '09:00', close: '21:00' },
            wednesday: { open: '09:00', close: '21:00' },
            thursday:  { open: '09:00', close: '21:00' },
            friday:    { open: '09:00', close: '22:00' },
            saturday:  { open: '09:00', close: '22:00' },
            sunday:    { open: '10:00', close: '20:00' },
        },
        planId: 'grow',
        orgType: 'dispensary',
        posSystem: null,
        website: 'https://lakeshorecannabisclub.com',
        loyaltyProgram: 'Club Rewards',
        // Brand identity — cool lakeside / navy and teal palette
        brandColors: {
            primary: '#1a4f6e',    // Deep navy blue
            secondary: '#2a9d8f',  // Teal
            accent: '#e9f5f3',     // Light mint
            text: '#1a2e35',       // Dark slate
            background: '#ffffff',
        },
        brandVoice: 'Friendly club atmosphere, knowledgeable staff, serving the Will County community.',
        tagline: 'Your Cannabis Club in Romeoville, IL.',
        marketContext: 'IL Adult-Use | Will County | Suburban Market',
        competitorSearchRadius: 15, // miles
        // Menu categories to seed
        menuSeed: [
            { category: 'Flower',    name: 'House Blend 3.5g',          price: 25,  size: '3.5g' },
            { category: 'Flower',    name: 'Premium Hybrid 3.5g',        price: 42,  size: '3.5g' },
            { category: 'Flower',    name: 'Top-Shelf Indica 3.5g',      price: 50,  size: '3.5g' },
            { category: 'Pre-Roll',  name: 'Classic Pre-Roll 1g',        price: 9,   size: '1g'   },
            { category: 'Pre-Roll',  name: 'Infused Pre-Roll 1g',        price: 18,  size: '1g'   },
            { category: 'Vape',      name: 'Live Resin Cart .5g',        price: 40,  size: '0.5g' },
            { category: 'Vape',      name: 'Distillate Cart 1g',         price: 52,  size: '1g'   },
            { category: 'Edible',    name: 'Gummy Bears 100mg',          price: 20,  size: '100mg' },
            { category: 'Edible',    name: 'Dark Chocolate 100mg',       price: 20,  size: '100mg' },
            { category: 'Concentrate', name: 'Rosin 1g',                 price: 60,  size: '1g'   },
            { category: 'Concentrate', name: 'Live Resin Sauce .5g',     price: 45,  size: '0.5g' },
            { category: 'Tincture',  name: 'Full Spectrum Tincture 1:1', price: 50,  size: '30ml' },
        ],
    },
];

// =============================================================================
// ARGS
// =============================================================================

const args = process.argv.slice(2);
const flags = {};
args.forEach((arg) => {
    if (arg.startsWith('--')) {
        const eqIdx = arg.indexOf('=');
        if (eqIdx > 0) {
            flags[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
        } else {
            flags[arg.slice(2)] = true;
        }
    }
});

const DRY_RUN = !flags.apply;
const ONLY_ORG = flags.org || null; // restrict to one org if specified

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  BakedBot Pilot Account Setup — Simply Pure Trenton + Lakeshore`);
    console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (add --apply to write)' : '🚀 LIVE — writing to Firestore + Auth'}`);
    console.log(`${'='.repeat(70)}\n`);

    const targets = ONLY_ORG
        ? PILOTS.filter((p) => p.slug === ONLY_ORG)
        : PILOTS;

    if (targets.length === 0) {
        console.error(`No pilot found for slug: ${ONLY_ORG}`);
        process.exit(1);
    }

    for (const pilot of targets) {
        console.log(`\n--- ${pilot.name} (${pilot.slug}) ---`);
        try {
            await setupPilot(pilot);
        } catch (err) {
            console.error(`  ❌ Failed: ${err.message}`);
            if (!DRY_RUN) throw err;
        }
    }

    if (DRY_RUN) {
        console.log('\n\n⚠️  DRY RUN — no data was written. Run with --apply to execute.\n');
    } else {
        console.log('\n\n✅ Pilot accounts set up successfully!\n');
        console.log('Next steps:');
        console.log('  1. Verify logins at https://bakedbot.ai/dashboard');
        console.log('  2. Trigger competitive intel: POST /api/cron/competitive-intel with orgId');
        console.log('  3. Set up Cloud Scheduler jobs for morning-briefing and competitive-intel');
        console.log('  4. Complete brand guide at /dashboard/settings/brand-guide\n');
    }
}

// =============================================================================
// SETUP SINGLE PILOT
// =============================================================================

async function setupPilot(pilot) {
    const orgId = `org_${pilot.slug}`;
    const tenantId = orgId; // tenants collection uses same ID

    // ---- 1. Firebase Auth user ----
    await createAuthUser(pilot);

    // ---- 2. Organization document ----
    await createOrgDocument(orgId, pilot);

    // ---- 3. Tenant document (mirrors org for multi-tenant data) ----
    await createTenantDocument(tenantId, orgId, pilot);

    // ---- 4. Brand document ----
    await createBrandDocument(pilot);

    // ---- 5. Brand guide (colors + voice) ----
    await createBrandGuide(orgId, pilot);

    // ---- 6. Seed menu products ----
    await seedMenuProducts(tenantId, pilot);

    // ---- 7. Default playbook assignments ----
    await assignDefaultPlaybooks(orgId, pilot);

    console.log(`  ✅ ${pilot.name} setup complete`);
}

// =============================================================================
// STEP IMPLEMENTATIONS
// =============================================================================

async function createAuthUser(pilot) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create Auth user: ${pilot.email}`);
        return;
    }

    try {
        const existing = await auth.getUserByEmail(pilot.email).catch(() => null);
        if (existing) {
            console.log(`  Auth user already exists: ${pilot.email} (uid: ${existing.uid})`);
            // Update password to ensure it matches
            await auth.updateUser(existing.uid, { password: pilot.password });
            console.log(`  Updated password for ${pilot.email}`);
            return;
        }

        const user = await auth.createUser({
            email: pilot.email,
            password: pilot.password,
            displayName: `${pilot.name} Admin`,
            emailVerified: true,
        });
        console.log(`  ✅ Auth user created: ${pilot.email} (uid: ${user.uid})`);

        // Set custom claims for dispensary admin role
        await auth.setCustomUserClaims(user.uid, {
            orgId: `org_${pilot.slug}`,
            role: 'dispensary_admin',
            orgType: 'dispensary',
        });
        console.log(`  Set custom claims: dispensary_admin @ org_${pilot.slug}`);
    } catch (err) {
        console.error(`  ❌ Auth user creation failed: ${err.message}`);
        throw err;
    }
}

async function createOrgDocument(orgId, pilot) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create organizations/${orgId}`);
        return;
    }

    const orgRef = db.collection('organizations').doc(orgId);
    const existing = await orgRef.get();
    if (existing.exists) {
        console.log(`  organizations/${orgId} already exists — merging updates`);
    }

    await orgRef.set({
        id: orgId,
        name: pilot.name,
        slug: pilot.slug,
        address: pilot.address,
        city: pilot.city,
        state: pilot.state,
        zip: pilot.zip,
        phone: pilot.phone,
        website: pilot.website,
        hours: pilot.hours,
        planId: pilot.planId,
        orgType: pilot.orgType,
        status: 'active',
        loginEmail: pilot.email,
        marketContext: pilot.marketContext,
        features: {
            competitiveIntel: true,
            priceMatch: true,      // Flagship feature for new pilots
            checkin: true,
            inbox: true,
            creativeCenter: true,
            menuPages: true,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`  ✅ organizations/${orgId}`);
}

async function createTenantDocument(tenantId, orgId, pilot) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create tenants/${tenantId}`);
        return;
    }

    const tenantRef = db.collection('tenants').doc(tenantId);
    await tenantRef.set({
        id: tenantId,
        orgId,
        name: pilot.name,
        slug: pilot.slug,
        city: pilot.city,
        state: pilot.state,
        zip: pilot.zip,
        phone: pilot.phone,
        hours: pilot.hours,
        planId: pilot.planId,
        status: 'active',
        marketContext: pilot.marketContext,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`  ✅ tenants/${tenantId}`);
}

async function createBrandDocument(pilot) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create brands/${pilot.slug}`);
        return;
    }

    await db.collection('brands').doc(pilot.slug).set({
        name: pilot.name,
        slug: pilot.slug,
        originalBrandId: `org_${pilot.slug}`,
        address: pilot.address,
        city: pilot.city,
        state: pilot.state,
        zip: pilot.zip,
        phone: pilot.phone,
        website: pilot.website,
        hours: pilot.hours,
        marketContext: pilot.marketContext,
        brandColors: pilot.brandColors,
        primaryColor: pilot.brandColors.primary,
        secondaryColor: pilot.brandColors.secondary,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`  ✅ brands/${pilot.slug}`);
}

async function createBrandGuide(orgId, pilot) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create brand guide for ${orgId}`);
        return;
    }

    const guideRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('brand_guide')
        .doc('current');

    await guideRef.set({
        orgId,
        name: pilot.name,
        tagline: pilot.tagline,
        brandVoice: pilot.brandVoice,
        loyaltyProgram: pilot.loyaltyProgram,
        colors: {
            primary: { hex: pilot.brandColors.primary, name: 'Primary', usage: 'CTAs, headers, key UI elements' },
            secondary: { hex: pilot.brandColors.secondary, name: 'Secondary', usage: 'Accents, badges, highlights' },
            accent: { hex: pilot.brandColors.accent, name: 'Accent', usage: 'Backgrounds, subtle fills' },
            background: { hex: pilot.brandColors.background, name: 'Background', usage: 'Page background' },
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        version: '1.0',
        completionPercent: 40, // Starter config — customer completes rest
    }, { merge: true });

    console.log(`  ✅ brand_guide/current for ${orgId}`);
}

async function seedMenuProducts(tenantId, pilot) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would seed ${pilot.menuSeed.length} products for ${tenantId}`);
        return;
    }

    const batch = db.batch();
    const now = new Date();

    pilot.menuSeed.forEach((product, i) => {
        const docId = `seed_${pilot.slug}_${i}`;
        const ref = db
            .collection('tenants')
            .doc(tenantId)
            .collection('products')
            .doc(docId);

        batch.set(ref, {
            id: docId,
            name: product.name,
            category: product.category,
            price: product.price,
            size: product.size,
            status: 'active',
            source: 'seed',
            createdAt: now,
            updatedAt: now,
        }, { merge: true });
    });

    await batch.commit();
    console.log(`  ✅ Seeded ${pilot.menuSeed.length} menu products for ${tenantId}`);
}

async function assignDefaultPlaybooks(orgId, pilot) {
    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would assign default playbooks for ${orgId}`);
        return;
    }

    const growPlaybooks = [
        'welcome-sequence',
        'menu-health-scan',
        'weekly-competitive-snapshot',
        'inventory-promo',
        'loyalty-engagement',
        'price-match-monitor',    // New — triggered by PriceMatchInsightsGenerator
    ];

    const batch = db.batch();

    for (const playbookId of growPlaybooks) {
        const ref = db
            .collection('organizations')
            .doc(orgId)
            .collection('playbook_assignments')
            .doc(playbookId);

        batch.set(ref, {
            orgId,
            playbookId,
            status: 'paused', // Customer activates manually
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    await batch.commit();
    console.log(`  ✅ Assigned ${growPlaybooks.length} default playbooks for ${orgId}`);
}

// =============================================================================
// RUN
// =============================================================================

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
