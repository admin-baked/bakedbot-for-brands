#!/usr/bin/env node
/**
 * seed-lakeshore-menu.mjs — Seed Lakeshore Cannabis Club menu with real scraped products
 * Products scraped from cannmenus.com via Firecrawl
 *
 * Usage:
 *   node scripts/seed-lakeshore-menu.mjs              # dry-run
 *   node scripts/seed-lakeshore-menu.mjs --apply      # write to Firestore
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// ENV
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line) => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eqIdx = line.indexOf('=');
            const key = line.slice(0, eqIdx).trim();
            const val = line.slice(eqIdx + 1).trim();
            if (key && !process.env[key]) process.env[key] = val;
        }
    });
}

if (getApps().length === 0) {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const ORG_ID = 'org_lakeshorecannabis';

const PRODUCTS = [
    { name: 'Hashburger', category: 'flower', price: 42, brand: 'Aeriz', size: '3.5g' },
    { name: 'Wonder Laugh Tangerine', category: 'edible', price: 16.25, brand: 'Wonder Wellness', size: '20pk' },
    { name: 'Anytime Huckleberry', category: 'edible', price: 16.25, brand: 'Beboe', size: '20pk' },
    { name: 'Sour Berry Bliss', category: 'edible', price: 18.20, brand: 'KANHA', size: '10pk' },
    { name: 'Strawberry Watermelon Disc', category: 'edible', price: 8.40, brand: 'KANHA', size: '10pk' },
    { name: 'Bitter Orange', category: 'flower', price: 48.75, brand: 'FloraCal Farms', size: '1.0g' },
    { name: 'Rest RSO', category: 'concentrate', price: 19.50, brand: 'Remedi', size: '0.5g' },
    { name: 'Cherry Lemon Disc', category: 'edible', price: 11.20, brand: 'KANHA', size: '10pk' },
    { name: 'The Bling', category: 'flower', price: 29, brand: 'Cresco', size: '3.5g' },
    { name: 'Sour Cherry', category: 'edible', price: 17.50, brand: 'WYLD', size: '100mg' },
    { name: 'Freshly Picked Berries', category: 'edible', price: 16.25, brand: "Mindy's Edibles", size: '20pk' },
    { name: 'Grape', category: 'edible', price: 7, brand: 'Ozone', size: '5pk' },
    { name: 'Lush Black Cherry', category: 'edible', price: 22.75, brand: "Mindy's Edibles", size: '20pk' },
    { name: 'Raspberry x Wedding Cake', category: 'edible', price: 19.50, brand: 'Lost Farm', size: '10pk' },
    { name: 'GMO Oz', category: 'flower', price: 14, brand: 'Aeriz', size: '0.5g' },
    { name: 'Sour Melon Rush', category: 'edible', price: 18.20, brand: 'KANHA', size: '10pk' },
    { name: 'Clementine Afternoon Delight #4', category: 'edible', price: 18.20, brand: 'RYTHM', size: '10pk' },
    { name: 'Sour Island Breeze', category: 'edible', price: 18.20, brand: 'KANHA', size: '10pk' },
    { name: 'Relief RSO', category: 'concentrate', price: 19.50, brand: 'Remedi', size: '0.5g' },
    { name: 'Dominion Diesel', category: 'flower', price: 8.40, brand: 'Botanist', size: '1.0g' },
    { name: 'Chem Berry', category: 'flower', price: 42, brand: 'Aeriz', size: '3.5g' },
];

const DRY_RUN = !process.argv.includes('--apply');

async function main() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Lakeshore Cannabis Club — Menu Seeder`);
    console.log(`  Org: ${ORG_ID}`);
    console.log(`  Products: ${PRODUCTS.length}`);
    console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`);
    console.log(`${'='.repeat(60)}\n`);

    if (DRY_RUN) {
        PRODUCTS.forEach((p) => {
            console.log(`  [DRY] ${p.name} — ${p.category} — $${p.price} — ${p.brand} (${p.size})`);
        });
        console.log(`\n⚠️  DRY RUN — no data written. Run with --apply to seed.\n`);
        return;
    }

    // Delete existing seeded products first
    const existing = await db
        .collection('tenants').doc(ORG_ID)
        .collection('products')
        .where('source', '==', 'firecrawl')
        .get();

    if (!existing.empty) {
        console.log(`🗑️  Removing ${existing.size} existing firecrawl products...`);
        const batch = db.batch();
        existing.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }

    // Seed new products in batches of 20
    const chunks = [];
    for (let i = 0; i < PRODUCTS.length; i += 20) chunks.push(PRODUCTS.slice(i, i + 20));

    let seeded = 0;
    for (const chunk of chunks) {
        const batch = db.batch();
        for (const p of chunk) {
            const id = uuidv4();
            const ref = db.collection('tenants').doc(ORG_ID).collection('products').doc(id);
            batch.set(ref, {
                id,
                name: p.name,
                category: p.category,
                price: p.price,
                brand: p.brand,
                size: p.size,
                status: 'active',
                source: 'firecrawl',
                orgId: ORG_ID,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            seeded++;
        }
        await batch.commit();
    }

    console.log(`✅ Seeded ${seeded} products for ${ORG_ID}\n`);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
