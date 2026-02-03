/**
 * Add First Student - Rishabh
 *
 * Creates first training cohort and enrolls Rishabh
 */

import { getAdminFirestore } from '../src/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { UserTrainingProgress, TrainingCohort } from '../src/types/training';

async function addFirstStudent() {
    console.log('🎓 Adding First Student: Rishabh\n');

    const db = getAdminFirestore();
    const auth = getAuth();

    try {
        // Step 1: Create or get Firebase Auth user for Rishabh
        console.log('👤 Step 1: Setting up Firebase Auth user...');
        let rishabhUser;

        try {
            // Try to get existing user
            rishabhUser = await auth.getUserByEmail('rishabh@bakedbot.ai');
            console.log(`   ✅ Found existing user: ${rishabhUser.uid}`);
        } catch (error) {
            // Create new user if doesn't exist
            console.log('   Creating new user account...');
            rishabhUser = await auth.createUser({
                email: 'rishabh@bakedbot.ai',
                emailVerified: false,
                password: 'TempPassword123!', // Rishabh should change this on first login
                displayName: 'Rishabh',
                disabled: false,
            });
            console.log(`   ✅ Created user: ${rishabhUser.uid}`);
            console.log(`   📧 Email: rishabh@bakedbot.ai`);
            console.log(`   🔑 Temp Password: TempPassword123!`);
        }

        // Step 2: Assign intern role
        console.log('\n🎯 Step 2: Assigning intern role...');
        const currentClaims = rishabhUser.customClaims || {};
        const roles = currentClaims.roles || [];
        if (!roles.includes('intern')) {
            roles.push('intern');
        }

        await auth.setCustomUserClaims(rishabhUser.uid, {
            ...currentClaims,
            roles,
        });
        console.log('   ✅ Assigned "intern" role');

        // Step 3: Create or get training cohort
        console.log('\n📚 Step 3: Setting up training cohort...');
        const cohortId = 'cohort-pilot-2026-02';
        const cohortRef = db.collection('trainingCohorts').doc(cohortId);
        const cohortDoc = await cohortRef.get();

        let cohort: TrainingCohort;

        if (!cohortDoc.exists) {
            console.log('   Creating first training cohort...');

            const startDate = new Date('2026-02-03');
            const endDate = new Date('2026-03-31'); // 8 weeks

            cohort = {
                id: cohortId,
                programId: 'bakedbot-builder-bootcamp',
                name: 'Pilot Cohort - Feb 2026',
                description: 'First cohort of BakedBot Builder Bootcamp',
                status: 'active',
                startDate: Timestamp.fromDate(startDate),
                endDate: Timestamp.fromDate(endDate),
                maxParticipants: 50,
                participantIds: [],
                instructors: [],
                minReviewsRequired: 2,
                reviewersPerSubmission: 2,
                reviewDeadlineHours: 48,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            await cohortRef.set(cohort);
            console.log(`   ✅ Created cohort: ${cohort.name}`);
        } else {
            cohort = cohortDoc.data() as TrainingCohort;
            console.log(`   ✅ Found existing cohort: ${cohort.name}`);
        }

        // Step 4: Enroll Rishabh in cohort
        console.log('\n📝 Step 4: Enrolling in cohort...');
        const progressRef = db.collection('users').doc(rishabhUser.uid).collection('training').doc('current');

        const progress: UserTrainingProgress = {
            cohortId: cohort.id,
            programId: cohort.programId,
            enrolledAt: Timestamp.now(),
            currentWeek: 1,
            completedChallenges: [],
            totalSubmissions: 0,
            acceptedSubmissions: 0,
            weeklyProgress: [],
            certificateEarned: false,
            lastActivityAt: Timestamp.now(),
            status: 'active',
            reviewsCompleted: 0,
            reviewsAssigned: 0,
            averageReviewRating: 0,
            reviewBadges: [],
        };

        await progressRef.set(progress);
        console.log('   ✅ Created training progress document');

        // Update cohort participant list
        await cohortRef.update({
            participantIds: [rishabhUser.uid],
            updatedAt: Timestamp.now(),
        });
        console.log('   ✅ Added to cohort participant list');

        // Step 5: Generate password reset link
        console.log('\n📧 Step 5: Generating invite link...');
        const resetLink = await auth.generatePasswordResetLink('rishabh@bakedbot.ai');

        console.log('\n' + '='.repeat(70));
        console.log('✅ SUCCESS! Rishabh has been added as the first student!');
        console.log('='.repeat(70));
        console.log('\n📋 Student Details:');
        console.log(`   Name: Rishabh`);
        console.log(`   Email: rishabh@bakedbot.ai`);
        console.log(`   User ID: ${rishabhUser.uid}`);
        console.log(`   Role: intern`);
        console.log(`   Cohort: ${cohort.name}`);
        console.log('\n🔐 Login Credentials:');
        console.log(`   Email: rishabh@bakedbot.ai`);
        console.log(`   Initial Password: TempPassword123!`);
        console.log('\n🔗 Password Reset Link (send this to Rishabh):');
        console.log(`   ${resetLink}`);
        console.log('\n📧 Next Steps:');
        console.log('   1. Send Rishabh the password reset link via email');
        console.log('   2. He can login at: https://bakedbot.ai/login');
        console.log('   3. After login, go to: https://bakedbot.ai/dashboard/training');
        console.log('\n💡 Email Template:');
        console.log('   ---');
        console.log('   Subject: Welcome to BakedBot Builder Bootcamp!');
        console.log('');
        console.log('   Hi Rishabh,');
        console.log('');
        console.log('   Welcome to the BakedBot Builder Bootcamp! 🎉');
        console.log('');
        console.log(`   You've been enrolled in: ${cohort.name}`);
        console.log('');
        console.log('   To get started:');
        console.log(`   1. Set your password: ${resetLink}`);
        console.log('   2. Login at: https://bakedbot.ai/login');
        console.log('   3. Access training: https://bakedbot.ai/dashboard/training');
        console.log('');
        console.log('   Your training starts today! Let\'s build something amazing.');
        console.log('');
        console.log('   Best,');
        console.log('   The BakedBot Team');
        console.log('   ---');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    }
}

// Run
addFirstStudent()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Failed:', error);
        process.exit(1);
    });
