/**
 * Setup Simple Super User Test Playbook
 *
 * This creates a minimal playbook that super users can run to test the system.
 * Steps:
 * 1. Create inbox notification
 * 2. Send test email
 *
 * Run with: npx tsx scripts/setup-super-user-test-playbook.ts
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
    logger.info('[Setup] Creating Super User Test Playbook...');

    try {
        // Create a simple test playbook in playbooks_internal (super user collection)
        const playbookData = {
            name: '🧪 System Test - Quick Validation',
            description: 'Simple 2-step test playbook for super users to validate the playbook execution system. Creates inbox notification and sends test email.',
            status: 'active',
            agent: 'system',
            category: 'testing',
            icon: 'flask',

            yaml: `name: System Test - Quick Validation
description: Validate playbook execution system
agent: system
category: testing

triggers:
  - type: manual  # Manual trigger only

steps:
  - action: create_inbox_notification
    label: "Create Test Notification"
    params:
      title: "✅ Playbook Test Successful"
      message: "The playbook execution system is working correctly!"
      priority: "normal"

  - action: send_email
    label: "Send Test Email"
    params:
      to: "{{userId.email}}"  # Send to triggering user
      subject: "✅ BakedBot Playbook Test Successful"
`,

            triggers: [
                {
                    type: 'manual',
                },
            ],

            steps: [
                {
                    id: 'step-1',
                    action: 'create_inbox_notification',
                    label: 'Create Test Notification',
                    params: {
                        title: '✅ Playbook Test Successful',
                        message: 'The playbook execution system is working correctly! This notification was created by a playbook.',
                        priority: 'normal',
                    },
                },
                {
                    id: 'step-2',
                    action: 'send_email',
                    label: 'Send Test Email',
                    params: {
                        to: 'martez@bakedbot.ai',  // Default to martez, can be overridden
                        subject: '✅ BakedBot Playbook Test Successful',
                    },
                },
            ],

            ownerId: 'system',
            ownerName: 'BakedBot System',
            isCustom: false,
            requiresApproval: false,
            createdBy: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1,

            // Super user playbooks go in playbooks_internal collection
            metadata: {
                isSuperUserOnly: true,
                testPlaybook: true,
                estimatedDuration: '5s',
            },
        };

        // Save to playbooks_internal (super user collection)
        const playbookRef = await firestore
            .collection('playbooks_internal')
            .add(playbookData);

        logger.info('[Setup] ✅ Test playbook created:', {
            playbookId: playbookRef.id,
            collection: 'playbooks_internal',
        });

        console.log('\n' + '='.repeat(70));
        console.log('✅ SUPER USER TEST PLAYBOOK CREATED');
        console.log('='.repeat(70));
        console.log(`\nPlaybook ID: ${playbookRef.id}`);
        console.log(`Collection: playbooks_internal`);
        console.log(`Name: ${playbookData.name}`);
        console.log(`\nSteps:`);
        console.log('  1. Create inbox notification');
        console.log('  2. Send test email to martez@bakedbot.ai');
        console.log('\nHow to Run:');
        console.log(`  1. Log into https://bakedbot.ai as super user`);
        console.log(`  2. Go to CEO Dashboard → Playbooks tab`);
        console.log(`  3. Find "🧪 System Test - Quick Validation"`);
        console.log(`  4. Click "Run Now" button`);
        console.log('\nOr use the manual trigger script:');
        console.log(`  node scripts/manual-trigger.js ${playbookRef.id} system YOUR_TOKEN`);
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Setup] Failed to create playbook:', { error });
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
