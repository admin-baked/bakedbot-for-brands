
import { executePlaybook } from '@/app/dashboard/ceo/agents/actions';

async function verifyPlaybook() {
    console.log('--- Verifying Competitor Takedown Playbook ---');

    // 1. Execute Playbook directly (bypassing scheduler entry for test)
    try {
        console.log('Running playbook: competitor-takedown-daily');
        const result = await executePlaybook('competitor-takedown-daily');
        
        console.log('Result Success:', result.success);
        console.log('Result Message:', result.message);
        console.log('Logs:', JSON.stringify(result.logs, null, 2));

        if (result.success && result.logs.some(l => l.includes('Big Worm Strategy'))) {
            console.log('VERIFICATION PASS: Playbook ran and invoked Big Worm.');
        } else {
            console.error('VERIFICATION FAIL: Playbook failed or did not log expected steps.');
        }

    } catch (e) {
        console.error('Playbook Exception:', e);
    }
}

// Mocking triggers for context (not strictly needed for this unit test but good practice)
// In real app, this would be fired by an API route.

verifyPlaybook().catch(console.error);
