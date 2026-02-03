/**
 * Training Data Seeding Script
 *
 * Populates Firestore with:
 * - Training program (bakedbot-builder-bootcamp-v1)
 * - Weeks 1-4 challenges (20 challenges total)
 * - Initial cohort for pilot interns
 *
 * Usage:
 *   npx tsx dev/seed-training.ts
 */

import { getAdminFirestore } from '../src/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { TRAINING_PROGRAM, WEEK_1_CHALLENGES, WEEK_2_CHALLENGES } from '../src/lib/training/curriculum';
import { WEEK_3_CHALLENGES, WEEK_4_CHALLENGES } from '../src/lib/training/weeks-3-4';
import type { TrainingProgram, TrainingChallenge, TrainingCohort } from '../src/types/training';

async function seedTraining() {
    console.log('🌱 Seeding training data...\n');

    const db = getAdminFirestore();

    try {
        // 1. Create Training Program
        console.log('📚 Creating training program...');
        const programRef = db.collection('trainingPrograms').doc(TRAINING_PROGRAM.id);

        const program: TrainingProgram = {
            ...TRAINING_PROGRAM,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await programRef.set(program);
        console.log(`✅ Created program: ${program.name}`);

        // 2. Create Challenges (Weeks 1-4)
        const allWeeks = [
            { number: 1, challenges: WEEK_1_CHALLENGES },
            { number: 2, challenges: WEEK_2_CHALLENGES },
            { number: 3, challenges: WEEK_3_CHALLENGES },
            { number: 4, challenges: WEEK_4_CHALLENGES },
        ];

        for (const week of allWeeks) {
            console.log(`\n📝 Creating Week ${week.number} challenges...`);
            for (const challengeData of week.challenges) {
                const challengeRef = db.collection('trainingChallenges').doc(challengeData.id);

                const challenge: TrainingChallenge = {
                    ...challengeData,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                };

                await challengeRef.set(challenge);
                console.log(`  ✅ ${challenge.title} (${challenge.difficulty})`);
            }
        }

        // 3. Create Initial Cohort (Pilot - 5 interns)
        console.log('\n👥 Creating initial cohort...');
        const cohortId = 'cohort-pilot-2026-02';
        const cohortRef = db.collection('trainingCohorts').doc(cohortId);

        const cohort: TrainingCohort = {
            id: cohortId,
            programId: TRAINING_PROGRAM.id,
            name: 'Pilot Cohort - February 2026',
            startDate: Timestamp.now(),
            endDate: Timestamp.fromDate(new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000)), // 8 weeks from now
            status: 'enrolling',
            participantIds: [],
            maxParticipants: 5,
            enablePeerReview: false, // Phase 2
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        await cohortRef.set(cohort);
        console.log(`✅ Created cohort: ${cohort.name}`);
        console.log(`   Max participants: ${cohort.maxParticipants}`);

        // 4. Summary
        const totalChallenges = WEEK_1_CHALLENGES.length + WEEK_2_CHALLENGES.length + WEEK_3_CHALLENGES.length + WEEK_4_CHALLENGES.length;
        console.log('\n✨ Seeding complete!');
        console.log('\n📊 Summary:');
        console.log(`   • Program: ${program.name}`);
        console.log(`   • Challenges: ${totalChallenges} (Weeks 1-4)`);
        console.log(`     - Week 1: ${WEEK_1_CHALLENGES.length} challenges`);
        console.log(`     - Week 2: ${WEEK_2_CHALLENGES.length} challenges`);
        console.log(`     - Week 3: ${WEEK_3_CHALLENGES.length} challenges`);
        console.log(`     - Week 4: ${WEEK_4_CHALLENGES.length} challenges`);
        console.log(`   • Cohort: ${cohort.name}`);
        console.log(`   • Status: Ready for enrollment`);

        console.log('\n📋 Next Steps:');
        console.log('   1. Enroll test interns using enrollInCohort() Server Action');
        console.log('   2. Navigate to /dashboard/training');
        console.log('   3. Verify curriculum displays correctly');
        console.log('   4. Test challenge submission and Linus review');

        console.log('\n💡 To enroll a user:');
        console.log(`   await enrollInCohort(userId, "${cohortId}")`);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedTraining()
        .then(() => {
            console.log('\n✅ Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Failed:', error);
            process.exit(1);
        });
}

export { seedTraining };
