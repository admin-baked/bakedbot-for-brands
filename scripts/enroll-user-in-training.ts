#!/usr/bin/env tsx
/**
 * Enroll User in Training
 *
 * Creates a user's training progress document and enrolls them in the program.
 *
 * Usage:
 *   npx tsx scripts/enroll-user-in-training.ts user@example.com [cohort-id]
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Firebase
function initializeFirebase() {
    if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKey) {
            try {
                const fs = require('fs');
                const path = require('path');
                const localSaPath = path.resolve(process.cwd(), 'service-account.json');
                if (fs.existsSync(localSaPath)) {
                    const serviceAccount = JSON.parse(fs.readFileSync(localSaPath, 'utf-8'));
                    initializeApp({ credential: cert(serviceAccount) });
                    return { auth: getAuth(), db: getFirestore() };
                }
            } catch (err) {
                // Continue to error below
            }

            throw new Error(
                'FIREBASE_SERVICE_ACCOUNT_KEY not found in environment.\n' +
                'Please set it in .env.local or create service-account.json'
            );
        }

        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountKey);
        } catch {
            serviceAccount = JSON.parse(
                Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
            );
        }

        initializeApp({ credential: cert(serviceAccount) });
    }

    return { auth: getAuth(), db: getFirestore() };
}

async function enrollUser(email: string, cohortId?: string) {
    console.log('🎓 Enrolling user in training program...\n');

    const { auth, db } = initializeFirebase();

    try {
        // 1. Get user
        console.log(`📧 Looking up user: ${email}`);
        const user = await auth.getUserByEmail(email);
        console.log(`✅ Found user: ${user.displayName || user.email} (${user.uid})`);

        // 2. Check if training program exists
        console.log('\n📚 Checking training program...');
        const programDoc = await db.collection('trainingPrograms').doc('bakedbot-builder-bootcamp-v1').get();

        if (!programDoc.exists) {
            console.error('❌ Training program not found!');
            console.log('\nRun this first: npx tsx scripts/seed-training-program.ts');
            process.exit(1);
        }
        console.log('✅ Training program found');

        // 3. Create user progress
        console.log('\n📝 Creating user progress...');
        const progressRef = db.collection('users').doc(user.uid).collection('training').doc('current');

        const progressData = {
            programId: 'bakedbot-builder-bootcamp-v1',
            userId: user.uid,
            cohortId: cohortId || null,
            status: 'active',
            currentWeek: 1,
            startedAt: Timestamp.now(),
            lastAccessedAt: Timestamp.now(),
            completedChallenges: [],
            totalChallenges: 36,
            completedWeeks: [],
        };

        await progressRef.set(progressData);
        console.log('✅ Progress document created');

        // 4. Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ Enrollment Complete!');
        console.log('='.repeat(60));
        console.log(`\n👤 User: ${user.email}`);
        console.log(`🆔 UID: ${user.uid}`);
        console.log(`📚 Program: BakedBot Builder Bootcamp`);
        if (cohortId) {
            console.log(`👥 Cohort: ${cohortId}`);
        }
        console.log(`📅 Started: ${new Date().toLocaleDateString()}`);

        console.log('\n🔗 User can now access: https://bakedbot.ai/dashboard/training');
        console.log('\n⚠️  User must sign out and back in if role was just set.');

        process.exit(0);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`\n❌ User not found: ${email}`);
            console.log('\nMake sure the user has signed up first.');
        } else {
            console.error('\n❌ Error enrolling user:', error);
        }
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2];
const cohortId = process.argv[3];

if (!email) {
    console.error('Usage: npx tsx scripts/enroll-user-in-training.ts user@example.com [cohort-id]');
    process.exit(1);
}

enrollUser(email, cohortId);
