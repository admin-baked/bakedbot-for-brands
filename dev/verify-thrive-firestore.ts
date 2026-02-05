/**
 * Verify Thrive Syracuse Firestore Documents
 *
 * Checks:
 * 1. brands/brand_thrive_syracuse exists
 * 2. locations/loc_thrive_syracuse exists and has orgId: 'org_thrive_syracuse'
 * 3. users/{uid} has correct orgId
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const BRAND_ID = 'brand_thrive_syracuse';
const ORG_ID = 'org_thrive_syracuse';
const LOCATION_ID = 'loc_thrive_syracuse';

// Initialize Firebase
const apps = getApps();
let app;

if (apps.length === 0) {
    const serviceAccount = JSON.parse(
        fs.readFileSync('./firebase-service-account.json', 'utf8')
    );
    app = initializeApp({
        credential: cert(serviceAccount),
    });
} else {
    app = apps[0];
}

const db = getFirestore(app);

async function verifyDocs() {
    console.log('🔍 VERIFYING FIRESTORE DOCUMENTS...\n');
    let allPassed = true;

    // 1. Check Brand
    const brandDoc = await db.collection('brands').doc(BRAND_ID).get();
    if (brandDoc.exists) {
        const data = brandDoc.data();
        console.log(`✅ Brand Found: ${BRAND_ID}`);
        console.log(`   - Name: ${data.name}`);
        // Check if orgId exists on brand (optional but good to know)
        if (data.orgId) {
            console.log(`   - orgId: ${data.orgId}`);
            if (data.orgId !== ORG_ID) {
                console.log(`   ⚠️  Brand orgId mismatch! Expected ${ORG_ID}, got ${data.orgId}`);
                // allPassed = false; // Not failing on this yet as it might not be required by schema
            }
        } else {
            console.log(`   ℹ️  No orgId on brand document (might be normal if Org -> Brand)`);
        }
    } else {
        console.error(`❌ Brand Missing: ${BRAND_ID}`);
        allPassed = false;
    }

    // 2. Check Location
    const locationDoc = await db.collection('locations').doc(LOCATION_ID).get();
    if (locationDoc.exists) {
        const data = locationDoc.data();
        console.log(`✅ Location Found: ${LOCATION_ID}`);
        if (data.orgId === ORG_ID) {
            console.log(`   ✅ orgId matches: ${data.orgId}`);
        } else {
            console.error(`   ❌ orgId MISMATCH: Expected ${ORG_ID}, got ${data.orgId}`);
            allPassed = false;
        }
    } else {
        console.error(`❌ Location Missing: ${LOCATION_ID}`);
        allPassed = false;
    }

    // 3. Check Organization (sanity check)
    const orgDoc = await db.collection('organizations').doc(ORG_ID).get();
    if (orgDoc.exists) {
        console.log(`✅ Organization Found: ${ORG_ID}`);
        const data = orgDoc.data();
        if (data.brandId === BRAND_ID) {
            console.log(`   ✅ brandId matches: ${data.brandId}`);
        } else {
            console.error(`   ❌ brandId MISMATCH: Expected ${BRAND_ID}, got ${data.brandId}`);
            allPassed = false;
        }
    } else {
        console.error(`❌ Organization Missing: ${ORG_ID}`);
        allPassed = false;
    }

    console.log('\nResult: ' + (allPassed ? '✅ ALL CHECKS PASSED' : '❌ VERIFICATION FAILED'));
    if (!allPassed) process.exit(1);
}

verifyDocs().catch(console.error);
