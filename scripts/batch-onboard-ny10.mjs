#!/usr/bin/env node

/**
 * batch-onboard-ny10.mjs — Batch Onboard NY Dispensaries
 *
 * Creates organization records, seeds competitors, and applies promo codes
 * for multiple dispensaries at once.
 *
 * Usage:
 *   node scripts/batch-onboard-ny10.mjs --config=scripts/ny10-dispensaries.json [--apply]
 *   node scripts/batch-onboard-ny10.mjs --single --name="Thrive Syracuse" --slug=thrivesyracuse \
 *     --email=owner@thrive.com --city=Syracuse --state=NY --pos=alleaves --promo=NYFOUNDINGPARTNER [--apply]
 *
 * Config JSON format:
 *   {
 *     "dispensaries": [
 *       {
 *         "name": "Thrive Syracuse",
 *         "slug": "thrivesyracuse",
 *         "email": "owner@example.com",
 *         "city": "Syracuse",
 *         "state": "NY",
 *         "zip": "13202",
 *         "posSystem": "alleaves",
 *         "promoCode": "NYFOUNDINGPARTNER",
 *         "planId": "scout"
 *       }
 *     ]
 *   }
 *
 * Flags:
 *   --apply    Actually write to Firestore (default: dry-run)
 *   --config   Path to JSON config file
 *   --single   Onboard a single dispensary via CLI args
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// =============================================================================
// ENV LOADING (Windows CRLF-safe)
// =============================================================================

const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach((line) => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eqIdx = line.indexOf('=');
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim();
            if (key && !process.env[key]) {
                process.env[key] = value;
            }
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

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  BakedBot NY10 Batch Onboarding`);
    console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (add --apply to write)' : '🚀 LIVE — writing to Firestore'}`);
    console.log(`${'='.repeat(60)}\n`);

    let dispensaries = [];

    if (flags.single) {
        // Single dispensary from CLI args
        dispensaries = [{
            name: flags.name || 'Unnamed Dispensary',
            slug: flags.slug || flags.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'unnamed',
            email: flags.email || '',
            city: flags.city || '',
            state: flags.state || 'NY',
            zip: flags.zip || '',
            posSystem: flags.pos || '',
            promoCode: flags.promo || '',
            planId: flags.plan || 'scout',
        }];
    } else if (flags.config) {
        // Load from JSON config
        const configPath = path.resolve(flags.config);
        if (!fs.existsSync(configPath)) {
            console.error(`ERROR: Config file not found: ${configPath}`);
            process.exit(1);
        }
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        dispensaries = config.dispensaries || [];
    } else {
        console.log('Usage:');
        console.log('  node scripts/batch-onboard-ny10.mjs --config=path/to/config.json [--apply]');
        console.log('  node scripts/batch-onboard-ny10.mjs --single --name="Name" --slug=slug --email=e@x.com --city=City --state=NY [--apply]');
        process.exit(0);
    }

    console.log(`Found ${dispensaries.length} dispensaries to onboard.\n`);

    const results = [];

    for (let i = 0; i < dispensaries.length; i++) {
        const disp = dispensaries[i];
        console.log(`[${i + 1}/${dispensaries.length}] ${disp.name}`);
        console.log(`  Slug: ${disp.slug} | City: ${disp.city}, ${disp.state} | POS: ${disp.posSystem || 'none'}`);

        try {
            const result = await onboardDispensary(disp);
            results.push({ ...disp, ...result });
            console.log(`  ✅ ${result.status}\n`);
        } catch (err) {
            results.push({ ...disp, status: 'error', error: err.message });
            console.log(`  ❌ Error: ${err.message}\n`);
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('  ONBOARDING SUMMARY');
    console.log(`${'='.repeat(60)}`);

    const created = results.filter(r => r.status === 'created');
    const skipped = results.filter(r => r.status === 'skipped');
    const errors = results.filter(r => r.status === 'error');

    console.log(`  Created: ${created.length}`);
    console.log(`  Skipped: ${skipped.length} (already exist)`);
    console.log(`  Errors:  ${errors.length}`);

    if (errors.length > 0) {
        console.log('\n  ERRORS:');
        errors.forEach(e => console.log(`    - ${e.name}: ${e.error}`));
    }

    if (DRY_RUN) {
        console.log('\n  ⚠️  DRY RUN — no data was written. Add --apply to execute.');
    }

    console.log('');
}

// =============================================================================
// ONBOARD SINGLE DISPENSARY
// =============================================================================

async function onboardDispensary(disp) {
    const orgId = `org_${disp.slug}`;
    const planId = disp.planId || 'scout';

    // Check if org already exists
    const existingOrg = await db.collection('organizations').doc(orgId).get();
    if (existingOrg.exists) {
        console.log(`  Organization ${orgId} already exists`);
        return { status: 'skipped', orgId };
    }

    if (DRY_RUN) {
        console.log(`  [DRY RUN] Would create: organizations/${orgId}`);
        if (disp.email) console.log(`  [DRY RUN] Would invite: ${disp.email}`);
        if (disp.promoCode) console.log(`  [DRY RUN] Would apply promo: ${disp.promoCode}`);
        if (disp.posSystem) console.log(`  [DRY RUN] Would set POS: ${disp.posSystem}`);
        return { status: 'created', orgId, dryRun: true };
    }

    // 1. Create organization document
    const orgData = {
        name: disp.name,
        slug: disp.slug,
        city: disp.city,
        state: disp.state,
        zip: disp.zip || '',
        planId,
        orgType: 'dispensary',
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        // POS system
        ...(disp.posSystem ? { posProvider: disp.posSystem } : {}),
        // Promo code
        ...(disp.promoCode ? {
            activePromo: {
                code: disp.promoCode,
                activatedAt: new Date().toISOString(),
                currentPhase: 0,
            },
        } : {}),
    };

    await db.collection('organizations').doc(orgId).set(orgData);
    console.log(`  Created organizations/${orgId}`);

    // 2. Create brand/slug document
    const brandData = {
        name: disp.name,
        slug: disp.slug,
        originalBrandId: orgId,
        city: disp.city,
        state: disp.state,
        createdAt: FieldValue.serverTimestamp(),
    };
    await db.collection('brands').doc(disp.slug).set(brandData, { merge: true });
    console.log(`  Created brands/${disp.slug}`);

    // 3. Send invite email (create invite doc)
    if (disp.email) {
        const inviteData = {
            email: disp.email,
            orgId,
            role: 'dispensary_admin',
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        };
        await db.collection('invitations').add(inviteData);
        console.log(`  Created invitation for ${disp.email}`);
    }

    // 4. Assign default playbooks for the plan tier
    const scoutPlaybooks = [
        'welcome-sequence',
        'menu-health-scan',
        'weekly-competitive-snapshot',
    ];

    for (const playbookId of scoutPlaybooks) {
        try {
            await db.collection('playbook_assignments').add({
                orgId,
                playbookId,
                status: 'paused', // Start paused until owner activates
                createdAt: FieldValue.serverTimestamp(),
            });
        } catch {
            // Non-fatal — playbook may not exist in templates
        }
    }
    console.log(`  Assigned ${scoutPlaybooks.length} playbooks (paused)`);

    return { status: 'created', orgId };
}

// =============================================================================
// RUN
// =============================================================================

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
