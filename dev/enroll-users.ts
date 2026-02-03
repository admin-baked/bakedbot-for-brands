/**
 * Bulk User Enrollment Script
 *
 * Enrolls multiple users into a training cohort and assigns intern role.
 *
 * Usage:
 *   npx tsx dev/enroll-users.ts --cohort cohort-pilot-2026-02 --users user1,user2,user3
 *   npx tsx dev/enroll-users.ts --cohort cohort-pilot-2026-02 --csv users.csv
 */

import { getAdminFirestore } from '../src/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { UserTrainingProgress, TrainingCohort } from '../src/types/training';
import * as fs from 'fs';

interface EnrollmentInput {
    cohortId: string;
    userIds?: string[];
    csvPath?: string;
}

/**
 * Parse CSV file with user data
 * Expected format: email,name
 */
function parseUserCSV(csvPath: string): string[] {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    // Skip header row
    const userEmails = lines.slice(1).map((line) => {
        const [email] = line.split(',').map((s) => s.trim());
        return email;
    });

    return userEmails;
}

/**
 * Get user ID from email
 */
async function getUserIdFromEmail(email: string): Promise<string | null> {
    try {
        const auth = getAuth();
        const user = await auth.getUserByEmail(email);
        return user.uid;
    } catch (error) {
        console.error(`❌ User not found: ${email}`);
        return null;
    }
}

/**
 * Assign intern role to user
 */
async function assignInternRole(userId: string): Promise<void> {
    const auth = getAuth();

    try {
        // Get current custom claims
        const user = await auth.getUser(userId);
        const currentClaims = user.customClaims || {};

        // Add intern role
        const roles = currentClaims.roles || [];
        if (!roles.includes('intern')) {
            roles.push('intern');
        }

        // Update custom claims
        await auth.setCustomUserClaims(userId, {
            ...currentClaims,
            roles,
        });

        console.log(`  ✅ Assigned 'intern' role to ${userId}`);
    } catch (error) {
        console.error(`  ❌ Failed to assign role to ${userId}:`, error);
        throw error;
    }
}

/**
 * Enroll user in cohort
 */
async function enrollUser(userId: string, cohortId: string, programId: string): Promise<void> {
    const db = getAdminFirestore();

    try {
        // Create user progress document
        const progressRef = db.collection('users').doc(userId).collection('training').doc('current');

        const progress: UserTrainingProgress = {
            cohortId,
            programId,
            enrolledAt: Timestamp.now(),
            currentWeek: 1,
            completedChallenges: [],
            totalSubmissions: 0,
            acceptedSubmissions: 0,
            weeklyProgress: [],
            certificateEarned: false,
            lastActivityAt: Timestamp.now(),
            status: 'active',
        };

        await progressRef.set(progress);

        // Update cohort participant list
        const cohortRef = db.collection('trainingCohorts').doc(cohortId);
        await cohortRef.update({
            participantIds: require('@google-cloud/firestore').FieldValue.arrayUnion(userId),
            updatedAt: Timestamp.now(),
        });

        console.log(`  ✅ Enrolled ${userId} in cohort ${cohortId}`);
    } catch (error) {
        console.error(`  ❌ Failed to enroll ${userId}:`, error);
        throw error;
    }
}

/**
 * Main enrollment function
 */
async function bulkEnroll(input: EnrollmentInput): Promise<void> {
    console.log('📚 Bulk User Enrollment\n');

    const db = getAdminFirestore();

    // Validate cohort exists
    const cohortDoc = await db.collection('trainingCohorts').doc(input.cohortId).get();
    if (!cohortDoc.exists) {
        throw new Error(`Cohort not found: ${input.cohortId}`);
    }

    const cohort = cohortDoc.data() as TrainingCohort;
    console.log(`📋 Cohort: ${cohort.name}`);
    console.log(`   Status: ${cohort.status}`);
    console.log(`   Max Participants: ${cohort.maxParticipants}`);
    console.log(`   Current Participants: ${cohort.participantIds.length}\n`);

    // Get user list
    let userIds: string[] = [];

    if (input.csvPath) {
        console.log(`📄 Reading users from CSV: ${input.csvPath}`);
        const emails = parseUserCSV(input.csvPath);
        console.log(`   Found ${emails.length} emails\n`);

        // Convert emails to user IDs
        for (const email of emails) {
            const uid = await getUserIdFromEmail(email);
            if (uid) {
                userIds.push(uid);
            }
        }
    } else if (input.userIds) {
        userIds = input.userIds;
    } else {
        throw new Error('Must provide either --users or --csv');
    }

    console.log(`👥 Enrolling ${userIds.length} users...\n`);

    // Check capacity
    const availableSlots = cohort.maxParticipants - cohort.participantIds.length;
    if (userIds.length > availableSlots) {
        console.warn(`⚠️  Warning: ${userIds.length} users exceed available slots (${availableSlots})`);
        console.warn(`   Some enrollments may fail.\n`);
    }

    let successCount = 0;
    let failCount = 0;

    // Enroll each user
    for (const userId of userIds) {
        try {
            console.log(`\nProcessing user: ${userId}`);

            // 1. Assign intern role
            await assignInternRole(userId);

            // 2. Enroll in cohort
            await enrollUser(userId, input.cohortId, cohort.programId);

            successCount++;
        } catch (error) {
            console.error(`❌ Failed to process ${userId}:`, error);
            failCount++;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Enrollment Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Total: ${userIds.length}`);
    console.log('='.repeat(60));

    if (successCount > 0) {
        console.log('\n📧 Next Steps:');
        console.log('   1. Send welcome emails to enrolled users');
        console.log('   2. Invite to Slack channel');
        console.log('   3. Schedule kick-off Google Meet');
        console.log('\n   Run: npx tsx dev/send-welcome-emails.ts --cohort ' + input.cohortId);
    }
}

// CLI Argument Parsing
function parseArgs(): EnrollmentInput {
    const args = process.argv.slice(2);
    const input: EnrollmentInput = { cohortId: '' };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--cohort' && args[i + 1]) {
            input.cohortId = args[i + 1];
            i++;
        } else if (args[i] === '--users' && args[i + 1]) {
            input.userIds = args[i + 1].split(',').map((s) => s.trim());
            i++;
        } else if (args[i] === '--csv' && args[i + 1]) {
            input.csvPath = args[i + 1];
            i++;
        }
    }

    if (!input.cohortId) {
        console.error('❌ Error: --cohort is required');
        console.log('\nUsage:');
        console.log('  npx tsx dev/enroll-users.ts --cohort COHORT_ID --users user1,user2,user3');
        console.log('  npx tsx dev/enroll-users.ts --cohort COHORT_ID --csv users.csv');
        process.exit(1);
    }

    return input;
}

// Run if called directly
if (require.main === module) {
    const input = parseArgs();

    bulkEnroll(input)
        .then(() => {
            console.log('\n✅ Enrollment complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Enrollment failed:', error);
            process.exit(1);
        });
}

export { bulkEnroll };
