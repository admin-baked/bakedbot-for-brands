/**
 * Diagnose Welcome Email System
 *
 * Checks:
 * 1. Pending welcome email jobs
 * 2. Failed welcome email jobs
 * 3. Recent completions
 * 4. Email leads without welcome emails
 *
 * Run with: npx tsx scripts/diagnose-welcome-emails.ts
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
    logger.info('[Diagnose] Checking welcome email system...\n');

    try {
        // 1. Check pending jobs
        const pendingJobs = await firestore
            .collection('jobs')
            .where('type', '==', 'send_welcome_email')
            .where('status', '==', 'pending')
            .get();

        console.log('='.repeat(70));
        console.log('📧 PENDING WELCOME EMAIL JOBS');
        console.log('='.repeat(70));
        console.log(`Count: ${pendingJobs.size}\n`);

        if (pendingJobs.size > 0) {
            pendingJobs.docs.slice(0, 5).forEach(doc => {
                const job = doc.data();
                console.log(`Job ID: ${doc.id}`);
                console.log(`Email: ${job.data?.email}`);
                console.log(`Created: ${new Date(job.createdAt).toISOString()}`);
                console.log('---');
            });
        }

        // 2. Check failed jobs
        const failedJobs = await firestore
            .collection('jobs')
            .where('type', '==', 'send_welcome_email')
            .where('status', '==', 'failed')
            .orderBy('failedAt', 'desc')
            .limit(10)
            .get();

        console.log('\n' + '='.repeat(70));
        console.log('❌ FAILED WELCOME EMAIL JOBS (Last 10)');
        console.log('='.repeat(70));
        console.log(`Count: ${failedJobs.size}\n`);

        if (failedJobs.size > 0) {
            failedJobs.docs.forEach(doc => {
                const job = doc.data();
                console.log(`Job ID: ${doc.id}`);
                console.log(`Email: ${job.data?.email}`);
                console.log(`Error: ${job.error}`);
                console.log(`Failed At: ${new Date(job.failedAt).toISOString()}`);
                console.log(`Attempts: ${job.attempts || 0}`);
                console.log('---');
            });
        }

        // 3. Check completed jobs (last 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const completedJobs = await firestore
            .collection('jobs')
            .where('type', '==', 'send_welcome_email')
            .where('status', '==', 'completed')
            .where('completedAt', '>=', oneDayAgo)
            .get();

        console.log('\n' + '='.repeat(70));
        console.log('✅ COMPLETED WELCOME EMAILS (Last 24 hours)');
        console.log('='.repeat(70));
        console.log(`Count: ${completedJobs.size}\n`);

        // 4. Check email leads without welcome emails
        const leadsWithoutWelcome = await firestore
            .collection('email_leads')
            .where('welcomeEmailSent', '==', false)
            .limit(10)
            .get();

        console.log('\n' + '='.repeat(70));
        console.log('📬 EMAIL LEADS WITHOUT WELCOME (First 10)');
        console.log('='.repeat(70));
        console.log(`Count: ${leadsWithoutWelcome.size}\n`);

        if (leadsWithoutWelcome.size > 0) {
            leadsWithoutWelcome.docs.forEach(doc => {
                const lead = doc.data();
                console.log(`Lead ID: ${doc.id}`);
                console.log(`Email: ${lead.email}`);
                console.log(`Created: ${new Date(lead.createdAt).toISOString()}`);
                console.log(`Brand: ${lead.brandId || 'N/A'}`);
                console.log('---');
            });
        }

        // 5. Summary and recommendations
        console.log('\n' + '='.repeat(70));
        console.log('🔍 DIAGNOSIS SUMMARY');
        console.log('='.repeat(70));

        const issues = [];

        if (pendingJobs.size > 0) {
            issues.push(`⚠️  ${pendingJobs.size} pending jobs not being processed`);
            issues.push('   → Cloud Scheduler may not be configured');
            issues.push('   → Or jobs endpoint is failing');
        }

        if (failedJobs.size > 0) {
            issues.push(`❌ ${failedJobs.size} failed jobs in last 10 attempts`);
            issues.push('   → Check error messages above');
            issues.push('   → Email service may be misconfigured');
        }

        if (leadsWithoutWelcome.size > 0) {
            issues.push(`📭 ${leadsWithoutWelcome.size} leads never got welcome emails`);
            issues.push('   → Jobs may not be created on signup');
            issues.push('   → Or job processor is not running');
        }

        if (completedJobs.size === 0) {
            issues.push(`🚨 NO welcome emails sent in last 24 hours`);
            issues.push('   → System appears to be completely broken');
        }

        if (issues.length > 0) {
            console.log('\n❌ ISSUES DETECTED:\n');
            issues.forEach(issue => console.log(issue));
        } else {
            console.log('\n✅ System appears healthy!');
            console.log(`   - ${completedJobs.size} emails sent in last 24 hours`);
            console.log(`   - No pending or failed jobs`);
        }

        console.log('\n' + '='.repeat(70));
        console.log('RECOMMENDED ACTIONS:');
        console.log('='.repeat(70));

        if (pendingJobs.size > 0) {
            console.log('\n1. Set up Cloud Scheduler:');
            console.log('   gcloud scheduler jobs create http welcome-email-processor \\');
            console.log('     --schedule="* * * * *" \\');
            console.log('     --uri="https://bakedbot.ai/api/jobs/welcome" \\');
            console.log('     --http-method=POST \\');
            console.log('     --location=us-central1');
            console.log('\n   OR manually trigger:');
            console.log('   curl -X POST https://bakedbot.ai/api/jobs/welcome');
        }

        if (failedJobs.size > 0) {
            console.log('\n2. Check email service configuration:');
            console.log('   - Verify MAILJET_API_KEY and MAILJET_SECRET_KEY');
            console.log('   - Check SendGrid fallback credentials');
            console.log('   - Review error messages in failed jobs');
        }

        console.log('\n3. Test the system:');
        console.log('   - Create a test lead');
        console.log('   - Check if job is created in Firestore');
        console.log('   - Manually trigger /api/jobs/welcome');
        console.log('   - Verify email delivery');

        console.log('\n' + '='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Diagnose] Failed:', { error });
        console.error('❌ Diagnosis failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
