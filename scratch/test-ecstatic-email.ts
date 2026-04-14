/**
 * Test Ecstatic Edibles 4/20 Welcome Email
 *
 * Creates a test lead and job for Ecstatic Edibles
 *
 * Run with: npx tsx scratch/test-ecstatic-email.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin
if (!getApps().length) {
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    initializeApp({
        credential: cert(serviceAccountPath),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

async function main() {
    const testEmail = 'martez@bakedbot.ai'; // Send test to user
    const testLeadId = `test_ecstatic_lead_${Date.now()}`;

    logger.info('[Test] Creating Ecstatic Edibles 4/20 welcome email job...');

    try {
        // 1. Create test lead
        await firestore.collection('email_leads').doc(testLeadId).set({
            email: testEmail,
            firstName: 'Martez',
            brandId: 'brand_ecstatic_edibles',
            source: 'ecstatic_launch_test',
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
                brandId: 'brand_ecstatic_edibles',
                state: 'NY',
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            attempts: 0,
        });

        logger.info('[Test] ✅ Welcome email job created:', { jobId: jobRef.id });

        console.log('\n' + '='.repeat(70));
        console.log('✅ ECSTATIC EDIBLES 4/20 TEST JOB CREATED');
        console.log('='.repeat(70));
        console.log(`\nTest Lead ID: ${testLeadId}`);
        console.log(`Job ID: ${jobRef.id}`);
        console.log(`Email: ${testEmail}`);
        console.log('\nVerification:');
        console.log('  1. Mrs. Parker will detect brand_ecstatic_edibles');
        console.log('  2. The custom 4/20 cookie-themed template will be used');
        console.log('  3. Check your email at martez@bakedbot.ai');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Test] Failed to create test job:', { error });
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
