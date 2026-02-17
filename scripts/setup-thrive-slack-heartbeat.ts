/**
 * Setup Slack Heartbeat Alerts for Thrive Syracuse
 *
 * Configures the Slack webhook URL in Firestore for Thrive's heartbeat notifications.
 * Alerts will be sent to #thrive-syracuse on critical/high priority events.
 *
 * Run with: npx tsx scripts/setup-thrive-slack-heartbeat.ts
 *
 * AI-THREAD: [Claude @ 2026-02-16] HEARTBEAT-SLACK
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            initializeApp({ credential: cert(serviceAccount) });
        } catch {
            initializeApp();
        }
    } else {
        initializeApp();
    }
}

const THRIVE_ORG_ID = 'org_thrive_syracuse';
// Set your Slack incoming webhook URL here (get from Slack App > Incoming Webhooks)
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

async function setup() {
    const db = getFirestore();

    console.log('Setting up Slack heartbeat alerts for Thrive Syracuse...');

    // Update the heartbeat config with the Slack webhook URL
    const configRef = db
        .collection('tenants')
        .doc(THRIVE_ORG_ID)
        .collection('settings')
        .doc('heartbeat');

    const existingConfig = await configRef.get();

    await configRef.set(
        {
            slackWebhookUrl: SLACK_WEBHOOK_URL,
            // Ensure 'slack' is in the channels array
            channels: existingConfig.exists
                ? [...new Set([...(existingConfig.data()?.channels || ['dashboard', 'email']), 'slack'])]
                : ['dashboard', 'email', 'slack'],
            updatedAt: new Date(),
        },
        { merge: true }
    );

    console.log('✅ Slack webhook configured for Thrive Syracuse');
    console.log(`   Webhook: ${SLACK_WEBHOOK_URL.slice(0, 50)}...`);
    console.log('   Channel: #thrive-syracuse');
    console.log('   Alerts: critical + high priority + alert/error status');
    console.log('\nTo test, trigger a manual heartbeat:');
    console.log('  POST /api/cron/heartbeat with { tenantId: "org_thrive_syracuse", ... }');
}

setup().catch(console.error);
