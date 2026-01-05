
import { defaultExecutiveTools } from '@/app/dashboard/ceo/agents/default-tools';
import { executePlaybook } from '@/app/dashboard/ceo/agents/actions';

async function verifyDigitalWorker() {
    console.log('--- Verifying Digital Worker (Playbook Creation) ---');

    // 1. Emulate Executive Agent calling 'createPlaybook'
    console.log('Step 1: Spawning new worker "Weekly Price Check"...');
    try {
        const result = await defaultExecutiveTools.createPlaybook(
            'Weekly Price Check', 
            'Checks competitor prices every Monday at 9am',
            [
               { action: 'delegate', agent: 'ezal', task: 'Get prices for 1g vapes in Chicago' },
               { action: 'notify', to: 'ceo@bakedbot.ai', subject: 'Weekly Price Report {{ezal.summary}}', body: 'Report Attached' }
            ],
            '0 9 * * 1' // Every Monday at 9am
        );

        console.log('Spawn Result:', result);

        if (result && result.success && result.playbookId) {
             console.log('PASS: Playbook created successfully.');
        } else {
             console.error('FAIL: Playbook creation failed.');
        }

    } catch (e) {
        console.error('Exception during generation:', e);
    }
}

verifyDigitalWorker().catch(console.error);
