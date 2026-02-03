/**
 * Standalone script to add Rishabh as first student
 * Uses Firebase Admin SDK directly
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
    });
}

const db = admin.firestore();
const auth = admin.auth();

async function addRishabh() {
    console.log('🎓 Adding Rishabh as First Student\n');

    try {
        // Step 1: Create or get user
        console.log('👤 Step 1: Setting up Firebase Auth user...');
        let user;

        try {
            user = await auth.getUserByEmail('rishabh@bakedbot.ai');
            console.log(`   ✅ Found existing user: ${user.uid}`);
        } catch (error) {
            console.log('   Creating new user...');
            user = await auth.createUser({
                email: 'rishabh@bakedbot.ai',
                emailVerified: false,
                password: 'TempPassword123!',
                displayName: 'Rishabh',
                disabled: false,
            });
            console.log(`   ✅ Created user: ${user.uid}`);
        }

        // Step 2: Assign intern role
        console.log('\n🎯 Step 2: Assigning intern role...');
        const currentClaims = user.customClaims || {};
        const roles = currentClaims.roles || [];
        if (!roles.includes('intern')) {
            roles.push('intern');
        }

        await auth.setCustomUserClaims(user.uid, {
            ...currentClaims,
            roles,
        });
        console.log('   ✅ Assigned "intern" role');

        // Step 3: Create cohort
        console.log('\n📚 Step 3: Creating training cohort...');
        const cohortId = 'cohort-pilot-2026-02';
        const cohortRef = db.collection('trainingCohorts').doc(cohortId);
        const cohortDoc = await cohortRef.get();

        if (!cohortDoc.exists) {
            const cohort = {
                id: cohortId,
                programId: 'bakedbot-builder-bootcamp',
                name: 'Pilot Cohort - Feb 2026',
                description: 'First cohort of BakedBot Builder Bootcamp',
                status: 'active',
                startDate: admin.firestore.Timestamp.fromDate(new Date('2026-02-03')),
                endDate: admin.firestore.Timestamp.fromDate(new Date('2026-03-31')),
                maxParticipants: 50,
                participantIds: [user.uid],
                instructors: [],
                minReviewsRequired: 2,
                reviewersPerSubmission: 2,
                reviewDeadlineHours: 48,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
            };

            await cohortRef.set(cohort);
            console.log('   ✅ Created cohort: Pilot Cohort - Feb 2026');
        } else {
            await cohortRef.update({
                participantIds: admin.firestore.FieldValue.arrayUnion(user.uid),
            });
            console.log('   ✅ Added to existing cohort');
        }

        // Step 4: Create progress document
        console.log('\n📝 Step 4: Creating training progress...');
        const progressRef = db.collection('users').doc(user.uid).collection('training').doc('current');

        const progress = {
            cohortId: cohortId,
            programId: 'bakedbot-builder-bootcamp',
            enrolledAt: admin.firestore.Timestamp.now(),
            currentWeek: 1,
            completedChallenges: [],
            totalSubmissions: 0,
            acceptedSubmissions: 0,
            weeklyProgress: [],
            certificateEarned: false,
            lastActivityAt: admin.firestore.Timestamp.now(),
            status: 'active',
            reviewsCompleted: 0,
            reviewsAssigned: 0,
            averageReviewRating: 0,
            reviewBadges: [],
        };

        await progressRef.set(progress);
        console.log('   ✅ Enrolled in cohort');

        // Step 5: Generate password reset link
        console.log('\n📧 Step 5: Generating invite link...');
        const resetLink = await auth.generatePasswordResetLink('rishabh@bakedbot.ai');

        // Success message
        console.log('\n' + '='.repeat(70));
        console.log('✅ SUCCESS! Rishabh has been enrolled!');
        console.log('='.repeat(70));
        console.log('\n📋 Details:');
        console.log(`   Email: rishabh@bakedbot.ai`);
        console.log(`   User ID: ${user.uid}`);
        console.log(`   Temp Password: TempPassword123!`);
        console.log('\n🔗 Send this password reset link to Rishabh:');
        console.log(`\n   ${resetLink}\n`);
        console.log('\n📧 Email Template:');
        console.log('━'.repeat(70));
        console.log('Subject: Welcome to BakedBot Builder Bootcamp! 🎓\n');
        console.log('Hi Rishabh,\n');
        console.log('Welcome to the BakedBot Builder Bootcamp!\n');
        console.log('You\'ve been enrolled in the Pilot Cohort starting today.\n');
        console.log('To get started:\n');
        console.log(`1. Set your password: ${resetLink}\n`);
        console.log('2. Login at: https://bakedbot.ai/login');
        console.log('3. Access training: https://bakedbot.ai/dashboard/training\n');
        console.log('Your journey to becoming a BakedBot expert starts now!\n');
        console.log('Best,');
        console.log('The BakedBot Team');
        console.log('━'.repeat(70));

    } catch (error) {
        console.error('\n❌ Error:', error);
        throw error;
    }
}

// Run
addRishabh()
    .then(() => {
        console.log('\n✅ Complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
