/**
 * Diagnose Weekly Nurture Email Issues
 *
 * Checks why a specific user isn't receiving weekly nurture emails.
 * Run with: npx tsx scripts/diagnose-weekly-nurture.ts
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();

async function diagnoseUser(email: string) {
    console.log(`\n🔍 Diagnosing weekly nurture for: ${email}\n`);

    try {
        // Find user by email
        const usersSnapshot = await db
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (usersSnapshot.empty) {
            console.log('❌ User not found in Firestore');
            return;
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        console.log('✅ User found!');
        console.log(`   User ID: ${userDoc.id}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role || 'NOT SET'}`);
        console.log(`   Name: ${userData.name || 'NOT SET'}`);

        // Check critical fields
        console.log('\n📋 Critical Fields:');
        console.log(`   onboardingCompletedAt: ${userData.onboardingCompletedAt || 'NOT SET ❌'}`);
        console.log(`   createdAt: ${userData.createdAt || 'NOT SET'}`);
        console.log(`   emailVerified: ${userData.emailVerified !== undefined ? userData.emailVerified : 'NOT SET'}`);

        // Check date eligibility
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const sevenDaysAgoISO = new Date(sevenDaysAgo).toISOString();

        console.log('\n📅 Date Eligibility:');
        console.log(`   7 days ago: ${sevenDaysAgoISO}`);

        if (userData.onboardingCompletedAt) {
            const onboardingDate = new Date(userData.onboardingCompletedAt);
            const isEligible = onboardingDate.getTime() < sevenDaysAgo;
            console.log(`   User onboarding: ${userData.onboardingCompletedAt}`);
            console.log(`   Eligible: ${isEligible ? '✅ YES' : '❌ NO (too recent)'}`);
        } else {
            console.log(`   ❌ onboardingCompletedAt missing - user won't match query!`);

            if (userData.createdAt) {
                const createdDate = new Date(userData.createdAt);
                const isEligible = createdDate.getTime() < sevenDaysAgo;
                console.log(`   Using createdAt as fallback: ${userData.createdAt}`);
                console.log(`   Would be eligible: ${isEligible ? '✅ YES' : '❌ NO'}`);
            }
        }

        // Check role mapping
        console.log('\n👤 Role Mapping:');
        const roleMap: Record<string, string[]> = {
            customer: ['customer'],
            super_user: ['super_user', 'admin'],
            dispensary_owner: ['dispensary', 'dispensary_manager', 'dispensary_budtender'],
            brand_marketer: ['brand', 'brand_manager'],
            lead: ['lead'],
        };

        const userRole = userData.role;
        let segment: string | null = null;

        for (const [seg, roles] of Object.entries(roleMap)) {
            if (roles.includes(userRole)) {
                segment = seg;
                break;
            }
        }

        if (segment) {
            console.log(`   ✅ Role "${userRole}" maps to segment: ${segment}`);
            console.log(`   Playbook ID: welcome_${segment.replace('_', '_')}`);
        } else {
            console.log(`   ❌ Role "${userRole}" does NOT map to any segment!`);
        }

        // Test query simulation
        console.log('\n🔍 Query Simulation:');
        console.log(`   Querying users where:`);
        console.log(`     - role IN ${JSON.stringify(roleMap[segment || 'super_user'])}`);
        console.log(`     - onboardingCompletedAt < "${sevenDaysAgoISO}"`);

        const testQuery = await db
            .collection('users')
            .where('role', 'in', roleMap[segment || 'super_user'])
            .where('onboardingCompletedAt', '<', sevenDaysAgoISO)
            .limit(10)
            .get();

        console.log(`   Results: ${testQuery.size} users found`);

        const userInResults = testQuery.docs.some(doc => doc.id === userDoc.id);
        console.log(`   This user in results: ${userInResults ? '✅ YES' : '❌ NO'}`);

        if (!userInResults && segment) {
            console.log('\n❌ PROBLEM IDENTIFIED:');
            if (!userData.onboardingCompletedAt) {
                console.log('   Missing onboardingCompletedAt field!');
                console.log('\n💡 FIX: Add onboardingCompletedAt to user document:');
                console.log(`
const userRef = db.collection('users').doc('${userDoc.id}');
await userRef.update({
    onboardingCompletedAt: new Date().toISOString()
});
                `.trim());
            }
        }

        console.log('\n✅ Diagnosis complete!\n');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run diagnosis
const email = 'martez@bakedbot.ai';
diagnoseUser(email).catch(console.error);
