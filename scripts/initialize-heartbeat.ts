/**
 * Initialize System Heartbeat
 *
 * Manually triggers a heartbeat execution to initialize the heartbeat_executions collection
 * and populate the health indicator.
 *
 * Usage:
 *   npx tsx scripts/initialize-heartbeat.ts
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    // Use Application Default Credentials (ADC) - works in Cloud environment
    // For local dev: gcloud auth application-default login
    initializeApp({
        projectId: 'bakedbot-prod',
    });
}

const db = getFirestore();

async function initializeHeartbeat() {
    try {
        console.log('🫀 Initializing system heartbeat...');

        // Create initial heartbeat execution record
        const executionId = `hb_init_${Date.now()}`;
        const now = new Date();

        await db.collection('heartbeat_executions').doc(executionId).set({
            executionId,
            tenantId: 'system',
            userId: 'system',
            role: 'super_user',
            startedAt: now,
            completedAt: now,
            checksRun: 0,
            resultsCount: 0,
            notifiableCount: 0,
            overallStatus: 'all_clear',
            notificationsSent: 0,
            suppressed: false,
            durationMs: 0,
            hiveMind: {
                agentBusMessages: 0,
                persistedToMemory: false,
                triggeredSleepTime: false,
            },
        });

        console.log('✅ System heartbeat initialized');
        console.log(`   Execution ID: ${executionId}`);
        console.log(`   Status: all_clear`);
        console.log('\n🎯 Next steps:');
        console.log('   1. Set up Cloud Scheduler cron job:');
        console.log('      gcloud scheduler jobs create http heartbeat-cron \\');
        console.log('        --schedule="*/5 * * * *" \\');
        console.log('        --uri="https://bakedbot.ai/api/cron/heartbeat" \\');
        console.log('        --http-method=GET \\');
        console.log('        --headers="Authorization=Bearer $(gcloud secrets versions access latest --secret=CRON_SECRET)" \\');
        console.log('        --location=us-central1');
        console.log('\n   2. Check health indicator at /dashboard');

    } catch (error) {
        console.error('❌ Failed to initialize heartbeat:', error);
        process.exit(1);
    }
}

initializeHeartbeat();
