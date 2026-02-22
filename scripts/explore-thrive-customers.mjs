#!/usr/bin/env node

/**
 * Explore Thrive Syracuse Customer Data Structure
 *
 * Helps identify where the 111 customers with emails are stored
 */

import admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const ORG_ID = 'org_thrive_syracuse';

async function initializeFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encodedKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
  }

  const serviceAccountJson = Buffer.from(encodedKey, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(serviceAccountJson);

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: 'studio-567050101-bc6e8',
  });
}

async function exploreThriveSyracuseData() {
  console.log('\n🔍 Exploring Thrive Syracuse Customer Data Structure\n');

  const app = await initializeFirebase();
  const db = getFirestore(app);

  try {
    // Check 1: Customers collection with orgId filter
    console.log('📋 Check 1: customers collection with orgId filter');
    const customersSnapshot = await db
      .collection('customers')
      .where('orgId', '==', ORG_ID)
      .limit(10)
      .get();

    console.log(`   Found: ${customersSnapshot.size} documents`);
    if (customersSnapshot.size > 0) {
      console.log('   Sample document:');
      const sample = customersSnapshot.docs[0].data();
      console.log(`     Email: ${sample.email || '(no email)'}`);
      console.log(`     Name: ${sample.firstName || ''} ${sample.lastName || ''}`);
      console.log(`     ID: ${customersSnapshot.docs[0].id}`);
    }

    // Check 2: Get all orgId values in customers collection
    console.log('\n📋 Check 2: All distinct orgIds in customers collection');
    const allCustomersSnapshot = await db
      .collection('customers')
      .limit(100)
      .get();

    const orgIds = new Set();
    allCustomersSnapshot.docs.forEach((doc) => {
      const orgId = doc.data().orgId;
      if (orgId) orgIds.add(orgId);
    });

    console.log(`   Found ${orgIds.size} distinct orgIds:`);
    [...orgIds].slice(0, 10).forEach((id) => {
      console.log(`     - ${id}`);
    });

    // Check 3: Look for collections that might contain Thrive customers
    console.log('\n📋 Check 3: Collections that might contain customer data');
    const collections = ['tenants', 'organizations', 'brands', 'customers_v2', 'crm_customers'];

    for (const collName of collections) {
      try {
        const snapshot = await db.collection(collName).limit(1).get();
        console.log(`   ${collName}: ${snapshot.size > 0 ? '✓ exists' : '✗ empty'}`);
      } catch (e) {
        console.log(`   ${collName}: ✗ collection does not exist`);
      }
    }

    // Check 4: Look for Thrive-specific collections
    console.log('\n📋 Check 4: Thrive Syracuse specific structures');
    try {
      // Check if there's a tenants document for Thrive
      const tenantDoc = await db.collection('tenants').doc(ORG_ID).get();
      console.log(`   tenants/${ORG_ID}: ${tenantDoc.exists ? '✓ exists' : '✗ does not exist'}`);
    } catch (e) {
      console.log(`   Error checking tenants: ${e.message}`);
    }

    // Check 5: Search by domain
    console.log('\n📋 Check 5: Customers with email domain @');
    const emailSnapshot = await db
      .collection('customers')
      .orderBy('email')
      .limit(20)
      .get();

    const emailDomains = new Set();
    emailSnapshot.docs.forEach((doc) => {
      const email = doc.data().email;
      if (email && email.includes('@')) {
        const domain = email.split('@')[1];
        emailDomains.add(domain);
      }
    });

    console.log(`   Found ${emailDomains.size} distinct email domains`);
    [...emailDomains].forEach((domain) => {
      console.log(`     - @${domain}`);
    });

    // Check 6: Count customers by orgId for Thrive
    console.log(`\n📋 Check 6: Count all customers for org_thrive_syracuse`);
    const thriveTotalSnapshot = await db
      .collection('customers')
      .where('orgId', '==', ORG_ID)
      .count()
      .get();

    console.log(`   Total customers: ${thriveTotalSnapshot.data().count}`);

    // Check 7: Count with email
    console.log(`\n📋 Check 7: Customers with email addresses`);
    const allThrive = await db
      .collection('customers')
      .where('orgId', '==', ORG_ID)
      .get();

    const withEmail = allThrive.docs.filter((doc) => doc.data().email).length;
    console.log(`   Customers with email: ${withEmail}`);

    if (allThrive.docs.length > 0) {
      console.log('\n   Sample customer documents:');
      allThrive.docs.slice(0, 3).forEach((doc, idx) => {
        const data = doc.data();
        console.log(`\n   Document ${idx + 1}:`);
        console.log(`     ID: ${doc.id}`);
        console.log(`     Email: ${data.email || '(none)'}`);
        console.log(`     Name: ${data.firstName || '(none)'} ${data.lastName || '(none)'}`);
        console.log(`     OrgId: ${data.orgId}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Exploration failed:', error);
  } finally {
    await app.delete();
  }
}

exploreThriveSyracuseData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
