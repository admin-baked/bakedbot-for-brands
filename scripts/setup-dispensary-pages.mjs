#!/usr/bin/env node
/**
 * setup-dispensary-pages.mjs
 *
 * Upserts brand + org docs for the three pilot dispensaries so that:
 * - DispensaryInfoPanel renders correctly (address, phone, hours)
 * - /zip/[zip]-dispensary pages resolve
 * - /cities/[city]-cannabis-dispensaries pages resolve
 * - menuDesign + type are set so isDispensaryMenu=true
 *
 * Usage:
 *   node scripts/setup-dispensary-pages.mjs              # dry-run
 *   node scripts/setup-dispensary-pages.mjs --apply      # write to Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// ── ENV ──────────────────────────────────────────────────────────────────────
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line) => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eq = line.indexOf('=');
            const k = line.slice(0, eq).trim();
            const v = line.slice(eq + 1).trim();
            if (k && !process.env[k]) process.env[k] = v;
        }
    });
}

if (!getApps().length) {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const DRY_RUN = !process.argv.includes('--apply');

// ── DISPENSARY CONFIGS ───────────────────────────────────────────────────────

const DISPENSARIES = [
    {
        // Thrive Syracuse — already has org + brand; needs location/hours/type patched
        orgId: 'org_thrive_syracuse',
        brandSlug: 'thrivesyracuse',
        name: 'Thrive Cannabis Marketplace',
        type: 'dispensary',
        menuDesign: 'dispensary',
        location: {
            address: '3065 Erie Blvd E',
            city: 'Syracuse',
            state: 'NY',
            zip: '13224',
            phone: '(315) 207-7935',
        },
        // Flat fields also set for zip/city page queries
        address: '3065 Erie Blvd E',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224',
        phone: '(315) 207-7935',
        hours: {
            monday: '10am-9pm',
            tuesday: '10am-9pm',
            wednesday: '10am-9pm',
            thursday: '10am-9pm',
            friday: '10am-9pm',
            saturday: '10am-9pm',
            sunday: '10am-9pm',
        },
    },
    {
        // Lakeshore Cannabis Club — org exists; brand has wrong hours format + missing fields
        orgId: 'org_lakeshorecannabis',
        brandSlug: 'lakeshorecannabis',
        name: 'Lakeshore Cannabis Club',
        type: 'dispensary',
        menuDesign: 'dispensary',
        location: {
            address: '2517 Sheridan Blvd',
            city: 'Edgewater',
            state: 'CO',
            zip: '80214',
            phone: '(720) 920-9617',
        },
        address: '2517 Sheridan Blvd',
        city: 'Edgewater',
        state: 'CO',
        zip: '80214',
        phone: '(720) 920-9617',
        // Normalize to string format DispensaryInfoPanel expects
        hours: {
            monday: '8am-12am',
            tuesday: '8am-12am',
            wednesday: '8am-12am',
            thursday: '8am-12am',
            friday: '8am-12am',
            saturday: '8am-12am',
            sunday: '8am-12am',
        },
        orgIdField: 'org_lakeshorecannabis',
    },
    {
        // Simply Pure Trenton — new org + brand
        orgId: 'org_simplypure',
        brandSlug: 'simplypure',
        name: 'Simply Pure Trenton',
        type: 'dispensary',
        menuDesign: 'dispensary',
        location: {
            address: '1531 N Olden Avenue Ext',
            city: 'Trenton',
            state: 'NJ',
            zip: '08638',
            phone: '(609) 388-7679',
        },
        address: '1531 N Olden Avenue Ext',
        city: 'Trenton',
        state: 'NJ',
        zip: '08638',
        phone: '(609) 388-7679',
        hours: {
            monday: '9am-10pm',
            tuesday: '9am-10pm',
            wednesday: '9am-10pm',
            thursday: '9am-10pm',
            friday: '9am-10pm',
            saturday: '9am-10pm',
            sunday: '9am-10pm',
        },
        createOrg: true,
    },
];

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log('  Dispensary Pages Setup');
    console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (add --apply to write)' : '🚀 LIVE — writing to Firestore'}`);
    console.log(`${'='.repeat(60)}\n`);

    for (const d of DISPENSARIES) {
        console.log(`\n▸ ${d.name} (${d.brandSlug})`);

        const brandFields = {
            name: d.name,
            slug: d.brandSlug,
            type: d.type,
            menuDesign: d.menuDesign,
            orgId: d.orgId,
            originalBrandId: d.orgId,
            location: d.location,
            address: d.address,
            city: d.city,
            state: d.state,
            zip: d.zip,
            phone: d.phone,
            hours: d.hours,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (DRY_RUN) {
            console.log(`  [DRY] brands/${d.brandSlug} ← upsert:`);
            console.log(`    type: ${d.type}, menuDesign: ${d.menuDesign}`);
            console.log(`    address: ${d.address}, ${d.city}, ${d.state} ${d.zip}`);
            console.log(`    phone: ${d.phone}`);
            console.log(`    hours: ${JSON.stringify(d.hours)}`);
            if (d.createOrg) {
                console.log(`  [DRY] organizations/${d.orgId} ← create`);
            }
            continue;
        }

        // Upsert brand doc
        await db.collection('brands').doc(d.brandSlug).set(brandFields, { merge: true });
        console.log(`  ✅ brands/${d.brandSlug} upserted`);

        // Create org doc if needed
        if (d.createOrg) {
            const orgRef = db.collection('organizations').doc(d.orgId);
            const existing = await orgRef.get();
            if (!existing.exists) {
                await orgRef.set({
                    name: d.name,
                    slug: d.brandSlug,
                    city: d.city,
                    state: d.state,
                    zip: d.zip,
                    orgType: 'dispensary',
                    status: 'active',
                    planId: 'scout',
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                console.log(`  ✅ organizations/${d.orgId} created`);
            } else {
                console.log(`  ⏭  organizations/${d.orgId} already exists`);
            }
        }

        // Print the live URLs
        console.log(`  🌐 Menu:     https://bakedbot.ai/${d.brandSlug}`);
        console.log(`  🔍 Zip page: https://bakedbot.ai/zip/${d.zip}-dispensary`);
        console.log(`  🏙  City page: https://bakedbot.ai/cities/${d.city.toLowerCase().replace(/\s+/g, '-')}-cannabis-dispensaries`);
    }

    console.log(`\n${'='.repeat(60)}`);
    if (DRY_RUN) {
        console.log('  ⚠️  DRY RUN — no data written. Run with --apply to execute.');
    } else {
        console.log('  ✅ All dispensary page configs applied.');
        console.log('\n  Live URLs:');
        DISPENSARIES.forEach((d) => {
            console.log(`    ${d.name}:`);
            console.log(`      Menu:  /${d.brandSlug}`);
            console.log(`      Zip:   /zip/${d.zip}-dispensary`);
            console.log(`      City:  /cities/${d.city.toLowerCase().replace(/\s+/g, '-')}-cannabis-dispensaries`);
        });
    }
    console.log(`${'='.repeat(60)}\n`);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
