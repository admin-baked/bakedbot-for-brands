#!/usr/bin/env node
/**
 * Diagnostic script for Firebase Build Monitor system
 * Checks:
 * 1. If build monitor collection exists and has records
 * 2. If Super Users are configured with email/Slack
 * 3. Email and Slack service health
 * 4. Recent build failures and notification status
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'studio-567050101-bc6e8'
    });
  } catch (e: any) {
    console.error('❌ Failed to initialize Firebase Admin:', e?.message || String(e));
    process.exit(1);
  }
}

const firestore = admin.firestore();

async function diagnose() {
  console.log('🔍 Firebase Build Monitor - Diagnostic Report\n');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Check if collection exists
    console.log('1️⃣  BUILD MONITOR COLLECTION');
    console.log('-'.repeat(60));
    const buildSnapshot = await firestore
      .collection('firebase_build_monitor')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (buildSnapshot.empty) {
      console.log('⚠️  No build records found');
      console.log('   → Collection may be empty or not created yet\n');
    } else {
      console.log(`✅ Found ${buildSnapshot.size} recent build records\n`);
      buildSnapshot.forEach((doc: any, idx: number) => {
        const data = doc.data();
        const ts = data.timestamp?.toDate?.() || new Date(data.timestamp);
        console.log(`   [${idx + 1}] ${data.commitHash.slice(0, 8)} | ${data.status}`);
        console.log(`       Time: ${ts.toISOString()}`);
        console.log(`       Notified: Email ${data.notificationsSent?.email ? '✅' : '❌'} | Slack ${data.notificationsSent?.slack ? '✅' : '❌'}`);
      });
    }
    console.log();

    // 2. Check for Super Users
    console.log('2️⃣  SUPER USER CONFIGURATION');
    console.log('-'.repeat(60));
    const superUsers = await firestore
      .collection('users')
      .where('role', '==', 'super_user')
      .get();

    if (superUsers.empty) {
      console.log('⚠️  No Super Users found!');
      console.log('   → Notifications cannot be sent (no recipients configured)\n');
    } else {
      console.log(`✅ Found ${superUsers.size} Super User(s)\n`);
      superUsers.forEach((doc: any, idx: number) => {
        const user = doc.data();
        const hasEmail = !!user.email;
        const hasSlack = !!user.slackUserId;
        console.log(`   [${idx + 1}] ${user.email || 'NO EMAIL'}`);
        console.log(`       Email: ${hasEmail ? '✅ ' + user.email : '❌ Not configured'}`);
        console.log(`       Slack: ${hasSlack ? '✅ ' + user.slackUserId : '❌ Not configured'}`);
        console.log(`       UID: ${doc.id}`);
      });
    }
    console.log();

    // 3. Check for failed builds that weren't notified
    console.log('3️⃣  FAILED BUILDS WITHOUT NOTIFICATION');
    console.log('-'.repeat(60));
    const failedNotNotified = await firestore
      .collection('firebase_build_monitor')
      .where('status', '==', 'failed')
      .where('notificationsSent.email', '==', false)
      .get();

    if (failedNotNotified.empty) {
      console.log('✅ All failed builds have been notified\n');
    } else {
      console.log(`⚠️  Found ${failedNotNotified.size} failed build(s) without notification:\n`);
      failedNotNotified.forEach((doc: any, idx: number) => {
        const data = doc.data();
        const ts = data.timestamp?.toDate?.() || new Date(data.timestamp);
        console.log(`   [${idx + 1}] ${data.commitHash.slice(0, 8)} @ ${ts.toISOString()}`);
        if (data.errorMessage) {
          console.log(`       Error: ${data.errorMessage.slice(0, 80)}`);
        }
      });
    }
    console.log();

    // 4. Linus agent status
    console.log('4️⃣  LINUS AGENT SETUP');
    console.log('-'.repeat(60));
    const linus = await firestore
      .collection('users')
      .where('email', '==', 'admin@bakedbot.ai')
      .get();

    if (linus.empty) {
      console.log('⚠️  Linus (admin@bakedbot.ai) user not found in database');
      console.log('   → Agent cannot send notifications\n');
    } else {
      const user = linus.docs[0].data();
      console.log('✅ Linus agent configured');
      console.log(`   Email: ${user.email || 'NOT SET'}`);
      console.log(`   Slack ID: ${user.slackUserId || 'NOT SET'}`);
      console.log(`   Role: ${user.role}`);
    }
    console.log();

    // 5. Summary
    console.log('SUMMARY');
    console.log('-'.repeat(60));
    const isHealthy = {
      hasBuilds: !buildSnapshot.empty,
      hasSuperUsers: !superUsers.empty,
      hasLinus: !linus.empty,
    };

    console.log(`Build Monitor Collection: ${isHealthy.hasBuilds ? '✅ OK' : '⚠️  EMPTY'}`);
    console.log(`Super Users Configured: ${isHealthy.hasSuperUsers ? '✅ OK' : '❌ MISSING'}`);
    console.log(`Linus Agent: ${isHealthy.hasLinus ? '✅ OK' : '⚠️  MISSING'}`);

    if (!isHealthy.hasSuperUsers) {
      console.log('\n❌ CRITICAL: No Super Users configured');
      console.log('   → Add a super_user to the users collection to receive alerts\n');
    }

    if (failedNotNotified.size > 0) {
      console.log(`\n⚠️  ACTION NEEDED: ${failedNotNotified.size} failed build(s) need notification\n`);
    }

  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error.message);
  } finally {
    await admin.app().delete();
  }
}

diagnose();
