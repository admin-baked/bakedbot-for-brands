/**
 * WeedMaps Image Backfill Script
 *
 * One-time (or periodic) script to scrape WeedMaps for NY cannabis product images
 * and sync them into Firestore/Firebase Storage for BakedBot product cards.
 *
 * Usage:
 *   node scripts/backfill-weedmaps-images.mjs [orgId] [--dry-run] [--force-rebuild]
 *
 * Examples:
 *   node scripts/backfill-weedmaps-images.mjs org_thrive_syracuse
 *   node scripts/backfill-weedmaps-images.mjs org_thrive_syracuse --dry-run
 *   node scripts/backfill-weedmaps-images.mjs org_thrive_syracuse --force-rebuild
 *   node scripts/backfill-weedmaps-images.mjs --all
 *
 * What it does:
 *  1. Fetches all NY dispensaries from WeedMaps API (~100 dispensaries)
 *  2. Fetches product menus with CDN image URLs (~100 products each)
 *  3. Builds brand+name → imageUrl catalog (cached 7 days in Firestore)
 *  4. Matches BakedBot Firestore products by (brand, name) normalization
 *  5. Downloads matched images, re-hosts on Firebase Storage
 *  6. Updates product.imageUrl in Firestore
 */

import { execSync } from 'child_process';

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://bakedbot.ai';

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceRebuild = args.includes('--force-rebuild');
const allOrgs = args.includes('--all');
const orgId = args.find(a => !a.startsWith('--'));

if (!CRON_SECRET) {
    console.error('❌ CRON_SECRET environment variable is required');
    console.error('   Set it: $env:CRON_SECRET = "your-secret"   (PowerShell)');
    console.error('   Or:     export CRON_SECRET=your-secret     (bash)');
    process.exit(1);
}

if (!orgId && !allOrgs) {
    console.error('❌ Provide an orgId or --all flag');
    console.error('   Usage: node scripts/backfill-weedmaps-images.mjs org_thrive_syracuse');
    console.error('   Usage: node scripts/backfill-weedmaps-images.mjs --all');
    process.exit(1);
}

const body = {
    orgId,
    dryRun,
    forceRebuild,
    allOrgs,
};

console.log('\n🌿 WeedMaps Image Backfill');
console.log('━'.repeat(50));
console.log(`  Target:        ${orgId || 'ALL orgs'}`);
console.log(`  Dry run:       ${dryRun ? 'YES (no writes)' : 'NO (will update Firestore)'}`);
console.log(`  Force rebuild: ${forceRebuild ? 'YES (re-scrape WeedMaps)' : 'NO (use cached catalog)'}`);
console.log(`  Endpoint:      POST ${BASE_URL}/api/cron/weedmaps-image-sync`);
console.log('');

if (!dryRun) {
    console.log('⚠️  This will update imageUrl on matched products in Firestore.');
    console.log('   Run with --dry-run first to preview matches.\n');
}

console.log('📡 Calling image sync endpoint...\n');

try {
    const resp = await fetch(`${BASE_URL}/api/cron/weedmaps-image-sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) {
        console.error(`❌ HTTP ${resp.status}:`, data);
        process.exit(1);
    }

    if (data.result) {
        const r = data.result;
        console.log('✅ Sync complete!');
        console.log('');
        console.log('📊 Results:');
        console.log(`   WeedMaps brands in catalog:  ${r.brandsFound}`);
        console.log(`   Product images in catalog:   ${r.productImagesFound}`);
        console.log(`   Products matched:            ${r.productsMatched}`);
        console.log(`   Products updated:            ${r.productsUpdated}`);
        console.log(`   Failed:                      ${r.productsFailed}`);
        console.log(`   Duration:                    ${(r.durationMs / 1000).toFixed(1)}s`);
    } else if (data.results) {
        console.log(`✅ All-orgs sync complete! ${data.orgsProcessed} orgs, ${data.totalUpdated} products updated.`);
        for (const r of data.results) {
            if (r.error) {
                console.log(`  ❌ ${r.orgId}: ${r.error}`);
            } else {
                console.log(`  ✅ ${r.orgId}: ${r.productsUpdated} updated / ${r.productsMatched} matched`);
            }
        }
    }

    console.log('');
    if (dryRun) {
        console.log('💡 This was a DRY RUN. Re-run without --dry-run to apply changes.');
    }
} catch (err) {
    console.error('❌ Request failed:', err.message);
    process.exit(1);
}
