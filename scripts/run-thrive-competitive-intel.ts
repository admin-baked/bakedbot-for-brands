/**
 * Manually trigger the Thrive Syracuse Competitive Intelligence Playbook
 *
 * Run with: npx tsx scripts/run-thrive-competitive-intel.ts
 */

// Direct Firebase Admin imports
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with Application Default Credentials
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

// Simple logger
const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

const THRIVE_ORG_ID = 'org_thrive_syracuse';
const PLAYBOOK_ID = 'mZVlcDru5iZRqWTlBHIF'; // Created by setup script

async function main() {
    logger.info('[Run] Triggering Competitive Intelligence Playbook...');
    logger.info('[Run] Playbook ID:', PLAYBOOK_ID);
    logger.info('[Run] Organization:', THRIVE_ORG_ID);

    try {
        // Get playbook from Firestore
        const playbookDoc = await firestore
            .collection('tenants')
            .doc(THRIVE_ORG_ID)
            .collection('playbooks')
            .doc(PLAYBOOK_ID)
            .get();

        if (!playbookDoc.exists) {
            throw new Error(`Playbook not found: ${PLAYBOOK_ID}`);
        }

        const playbook = playbookDoc.data();
        logger.info('[Run] Playbook found:', {
            name: playbook?.name,
            status: playbook?.status,
            steps: playbook?.steps?.length,
        });

        // Import and execute playbook
        const { executePlaybook } = await import('../src/server/services/playbook-executor');

        logger.info('[Run] Starting execution...');
        const startTime = Date.now();

        const result = await executePlaybook({
            playbookId: PLAYBOOK_ID,
            orgId: THRIVE_ORG_ID,
            userId: 'system',
            triggeredBy: 'manual',
            eventData: {},
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n' + '='.repeat(70));
        console.log('✅ PLAYBOOK EXECUTION COMPLETE');
        console.log('='.repeat(70));
        console.log(`\nExecution ID: ${result.executionId}`);
        console.log(`Status: ${result.status}`);
        console.log(`Duration: ${duration}s`);
        console.log(`\nStep Results:`);

        result.stepResults.forEach((step, i) => {
            const emoji = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏭️';
            console.log(`  ${emoji} Step ${i + 1}: ${step.action} - ${step.status}`);
            if (step.error) {
                console.log(`     Error: ${step.error}`);
            }
        });

        console.log('\nNext Steps:');
        console.log('  1. Check your inbox for the notification');
        console.log('  2. Check email at martez@bakedbot.ai');
        console.log('  3. View report in BakedBot Drive → Documents folder');
        console.log('  4. Review competitive actions in tenants/{orgId}/competitive_actions');
        console.log('='.repeat(70) + '\n');

        if (result.status === 'failed') {
            process.exit(1);
        }

    } catch (error) {
        logger.error('[Run] Execution failed:', { error });
        console.error('\n❌ Playbook execution failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
