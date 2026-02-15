/**
 * Test Welcome Email System
 *
 * Creates a test lead and job to verify the welcome email system works
 *
 * Run with: npx tsx scripts/test-welcome-email.ts
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

const firestore = getFirestore();

const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

async function main() {
    const testEmail = 'martez@bakedbot.ai'; // Send test to you
    const testLeadId = `test_lead_${Date.now()}`;

    logger.info('[Test] Creating test welcome email job...');

    try {
        // 1. Create test lead
        await firestore.collection('email_leads').doc(testLeadId).set({
            email: testEmail,
            firstName: 'Martez',
            brandId: 'bakedbot',
            source: 'test_script',
            state: 'NY',
            createdAt: Date.now(),
            welcomeEmailSent: false,
        });

        logger.info('[Test] ✅ Test lead created:', { leadId: testLeadId });

        // 2. Create welcome email job
        const jobRef = await firestore.collection('jobs').add({
            type: 'send_welcome_email',
            agent: 'mrs_parker',
            status: 'pending',
            data: {
                leadId: testLeadId,
                email: testEmail,
                firstName: 'Martez',
                brandId: 'bakedbot',
                state: 'NY',
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            attempts: 0,
        });

        logger.info('[Test] ✅ Welcome email job created:', { jobId: jobRef.id });

        console.log('\n' + '='.repeat(70));
        console.log('✅ TEST WELCOME EMAIL JOB CREATED');
        console.log('='.repeat(70));
        console.log(`\nTest Lead ID: ${testLeadId}`);
        console.log(`Job ID: ${jobRef.id}`);
        console.log(`Email: ${testEmail}`);
        console.log('\nWhat happens next:');
        console.log('  1. Cloud Scheduler runs in <1 minute');
        console.log('  2. POST /api/jobs/welcome processes the job');
        console.log('  3. Mrs. Parker sends personalized welcome email');
        console.log('  4. Lead info saved to Letta memory');
        console.log('  5. Check your email at martez@bakedbot.ai');
        console.log('\nMonitor the job:');
        console.log(`  - Check Firestore: jobs/${jobRef.id}`);
        console.log('  - Status will change: pending → running → completed');
        console.log('  - Or check for errors if status becomes "failed"');
        console.log('\nRun diagnosis:');
        console.log('  npx tsx scripts/diagnose-welcome-emails.ts');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Test] Failed to create test job:', { error });
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
