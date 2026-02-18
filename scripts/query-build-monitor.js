#!/usr/bin/env node
/**
 * Query Firebase Build Monitor collection to verify build records and alerts
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(process.env.HOME || process.env.USERPROFILE, '.config/gcloud/legacy_credentials/admin@bakedbot.ai/adc.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'studio-567050101-bc6e8'
  });
}

const firestore = admin.firestore();

async function queryBuildMonitor() {
  try {
    console.log('📊 Querying firebase_build_monitor collection...\n');

    // Query recent builds (last 20)
    const snapshot = await firestore
      .collection('firebase_build_monitor')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    if (snapshot.empty) {
      console.log('❌ No build monitor records found\n');
      return;
    }

    console.log(`✅ Found ${snapshot.size} records\n`);

    // Display each record
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
      const notifEmail = data.notificationsSent?.email ? '✅' : '❌';
      const notifSlack = data.notificationsSent?.slack ? '✅' : '❌';

      console.log(`[${index + 1}] ${data.commitHash.slice(0, 8)} | ${data.status.toUpperCase()}`);
      console.log(`    Time: ${timestamp.toISOString()}`);
      console.log(`    Duration: ${data.duration}ms`);
      if (data.errorMessage) {
        console.log(`    Error: ${data.errorMessage.slice(0, 100)}${data.errorMessage.length > 100 ? '...' : ''}`);
      }
      console.log(`    Notifications: Email ${notifEmail} | Slack ${notifSlack}`);
      console.log('');
    });

    // Search for specific commit (02dd171f)
    console.log('\n🔍 Searching for commit 02dd171f...\n');
    const specificBuild = await firestore
      .collection('firebase_build_monitor')
      .where('commitHash', '==', '02dd171f')
      .get();

    if (specificBuild.empty) {
      console.log('❌ Commit 02dd171f NOT found in build monitor records');
      console.log('   → System may not have monitored this build, or commit hash is longer');
    } else {
      const doc = specificBuild.docs[0];
      const data = doc.data();
      const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
      console.log('✅ Found 02dd171f record:');
      console.log(`   Status: ${data.status}`);
      console.log(`   Timestamp: ${timestamp.toISOString()}`);
      console.log(`   Email notified: ${data.notificationsSent?.email ? 'YES' : 'NO'}`);
      console.log(`   Slack notified: ${data.notificationsSent?.slack ? 'YES' : 'NO'}`);
      if (data.errorMessage) {
        console.log(`   Error: ${data.errorMessage}`);
      }
    }

    // Check for any failed builds in last 24 hours
    console.log('\n\n📉 Failed builds in last 24 hours:\n');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedBuilds = await firestore
      .collection('firebase_build_monitor')
      .where('status', '==', 'failed')
      .where('timestamp', '>=', oneDayAgo)
      .orderBy('timestamp', 'desc')
      .get();

    if (failedBuilds.empty) {
      console.log('✅ No failed builds in last 24 hours');
    } else {
      failedBuilds.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
        console.log(`- ${data.commitHash.slice(0, 8)} | ${timestamp.toISOString()}`);
        console.log(`  Notified: Email ${data.notificationsSent?.email ? '✅' : '❌'} | Slack ${data.notificationsSent?.slack ? '✅' : '❌'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error querying collection:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

queryBuildMonitor();
