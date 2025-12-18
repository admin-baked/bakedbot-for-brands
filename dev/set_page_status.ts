#!/usr/bin/env npx tsx
/**
 * Set Page Draft Status Script
 * 
 * Sets all Illinois SEO pages to draft status EXCEPT the top 25 Chicago ZIPs.
 * This aligns with the Model B Phase 1 rollout strategy.
 * 
 * Usage: npx tsx dev/set_page_status.ts
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Top 25 Chicago ZIPs for Phase 1 (to remain published)
const TOP_25_ZIPS = [
    '60601', '60602', '60603', '60604', '60605',
    '60606', '60607', '60608', '60609', '60610',
    '60611', '60612', '60613', '60614', '60615',
    '60616', '60617', '60618', '60619', '60620',
    '60621', '60622', '60623', '60624', '60625'
];

async function initFirebase() {
    if (getApps().length > 0) {
        return getFirestore(getApp());
    }

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccountBase64) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 not found in environment');
    }

    const serviceAccount = JSON.parse(
        Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
    );

    initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
    });

    return getFirestore();
}

interface PageUpdateResult {
    updated: number;
    keptPublished: number;
    errors: number;
}

async function setPageDraftStatus(dryRun: boolean = true): Promise<PageUpdateResult> {
    const db = await initFirebase();
    const result: PageUpdateResult = { updated: 0, keptPublished: 0, errors: 0 };

    console.log('\n📋 Set Page Draft Status Script');
    console.log('================================');
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE'}`);
    console.log(`Top 25 ZIPs (will remain published): ${TOP_25_ZIPS.join(', ')}`);
    console.log('');

    // Get all SEO pages
    const seoSnapshot = await db.collection('seo_pages').get();
    console.log(`Found ${seoSnapshot.size} total SEO pages\n`);

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of seoSnapshot.docs) {
        const data = doc.data();
        const pageId = doc.id;

        // Check if this is a ZIP page in the top 25
        const isTopZip = TOP_25_ZIPS.some(zip =>
            pageId.includes(zip) ||
            data.zip === zip ||
            data.zipCode === zip
        );

        if (isTopZip) {
            // Keep this page published
            if (data.status !== 'published') {
                if (!dryRun) {
                    batch.update(doc.ref, {
                        status: 'published',
                        indexable: true,
                        updatedAt: new Date()
                    });
                    batchCount++;
                }
                console.log(`✅ [PUBLISH] ${pageId}`);
            }
            result.keptPublished++;
        } else {
            // Set to draft
            if (data.status !== 'draft') {
                if (!dryRun) {
                    batch.update(doc.ref, {
                        status: 'draft',
                        indexable: false,
                        updatedAt: new Date()
                    });
                    batchCount++;
                }
                console.log(`📝 [DRAFT] ${pageId}`);
                result.updated++;
            }
        }

        // Commit batch every 400 updates (Firestore limit is 500)
        if (batchCount >= 400 && !dryRun) {
            await batch.commit();
            console.log(`\n💾 Committed batch of ${batchCount} updates`);
            batchCount = 0;
        }
    }

    // Commit remaining updates
    if (batchCount > 0 && !dryRun) {
        await batch.commit();
        console.log(`\n💾 Committed final batch of ${batchCount} updates`);
    }

    console.log('\n================================');
    console.log('📊 Summary:');
    console.log(`   Pages set to draft: ${result.updated}`);
    console.log(`   Pages kept published: ${result.keptPublished}`);
    console.log(`   Errors: ${result.errors}`);

    if (dryRun) {
        console.log('\n⚠️  DRY RUN - No changes made. Run with --live to apply changes.');
    } else {
        console.log('\n✅ Changes applied successfully!');
    }

    return result;
}

// Main execution
const isLive = process.argv.includes('--live');
setPageDraftStatus(!isLive)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
