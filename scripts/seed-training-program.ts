#!/usr/bin/env tsx
/**
 * Seed Training Program
 *
 * Seeds the complete BakedBot Builder Bootcamp curriculum into Firestore.
 *
 * Usage:
 *   npx tsx scripts/seed-training-program.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
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
                    return getFirestore();
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

    return getFirestore();
}

async function seedTrainingProgram() {
    console.log('🌱 Seeding BakedBot Builder Bootcamp...\n');

    const db = initializeFirebase();

    try {
        // Import curriculum
        const { TRAINING_PROGRAM, getAllChallenges } = await import('../src/lib/training/curriculum.js');

        // 1. Create Training Program
        console.log('📚 Creating training program...');
        const programRef = db.collection('trainingPrograms').doc('bakedbot-builder-bootcamp-v1');

        const programData = {
            ...TRAINING_PROGRAM,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await programRef.set(programData);
        console.log('✅ Training program created');

        // 2. Create Challenges
        console.log('\n📝 Creating challenges...');
        const challenges = getAllChallenges();
        const challengesCollection = db.collection('trainingChallenges');

        let count = 0;
        for (const challenge of challenges) {
            const challengeData = {
                ...challenge,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            await challengesCollection.doc(challenge.id).set(challengeData);
            count++;
            process.stdout.write(`\r   Created ${count}/${challenges.length} challenges...`);
        }
        console.log('\n✅ All challenges created');

        // 3. Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ Seeding Complete!');
        console.log('='.repeat(60));
        console.log(`\n📚 Program: ${TRAINING_PROGRAM.name}`);
        console.log(`📝 Challenges: ${challenges.length}`);
        console.log(`📅 Weeks: ${TRAINING_PROGRAM.durationWeeks}`);
        console.log(`\n🔗 Access at: https://bakedbot.ai/dashboard/training`);

        console.log('\n📋 Next Steps:');
        console.log('  1. Enroll users with: npx tsx scripts/enroll-user-in-training.ts email@example.com');
        console.log('  2. Or auto-enroll super_users on first visit');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding training program:', error);
        process.exit(1);
    }
}

seedTrainingProgram();
