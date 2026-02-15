/**
 * Trigger a playbook execution via API
 *
 * Run with: npx tsx scripts/trigger-playbook.ts <playbookId> <orgId>
 *
 * Example: npx tsx scripts/trigger-playbook.ts mZVlcDru5iZRqWTlBHIF org_thrive_syracuse
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const API_BASE = 'https://bakedbot.ai';
// const API_BASE = 'http://localhost:3000'; // Use for local testing

async function main() {
    const playbookId = process.argv[2] || 'mZVlcDru5iZRqWTlBHIF';
    const orgId = process.argv[3] || 'org_thrive_syracuse';

    console.log('[Trigger] Playbook ID:', playbookId);
    console.log('[Trigger] Organization:', orgId);
    console.log('[Trigger] API Base:', API_BASE);

    try {
        // Create a custom token for system user (or use super user email)
        const superUserEmail = 'martez@bakedbot.ai'; // Super user email

        console.log('[Trigger] Looking up super user:', superUserEmail);
        const userRecord = await getAuth().getUserByEmail(superUserEmail);

        console.log('[Trigger] Creating custom token for:', userRecord.uid);
        const customToken = await getAuth().createCustomToken(userRecord.uid);

        // Exchange custom token for ID token
        const exchangeResponse = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY || 'AIzaSyBcF5nXDfTzC8MZCEYbqOE6_Jj9r9zQ9kI'}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: customToken, returnSecureToken: true }),
            }
        );

        if (!exchangeResponse.ok) {
            throw new Error(`Failed to exchange token: ${await exchangeResponse.text()}`);
        }

        const { idToken } = await exchangeResponse.json() as { idToken: string };
        console.log('[Trigger] ID token obtained, calling API...');

        // Call the playbook execution API
        const startTime = Date.now();
        const response = await fetch(`${API_BASE}/api/playbooks/${playbookId}/execute`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                triggeredBy: 'manual',
                orgId,
            }),
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API error (${response.status}): ${error}`);
        }

        const result = await response.json();

        console.log('\n' + '='.repeat(70));
        console.log('✅ PLAYBOOK EXECUTION COMPLETE');
        console.log('='.repeat(70));
        console.log(`\nExecution ID: ${result.executionId}`);
        console.log(`Status: ${result.status}`);
        console.log(`Duration: ${duration}s`);
        console.log(`\nStep Results:`);

        result.stepResults?.forEach((step: any, i: number) => {
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

        if (!result.success) {
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Execution failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
