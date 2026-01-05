
import 'dotenv/config'; // Load .env
import { executePlaybook } from '@/app/dashboard/ceo/agents/actions';

async function verifyPlaybook() {
    console.log('--- Debugging Competitor Takedown Playbook ---');

    try {
        console.log('Running playbook: competitor-takedown-daily');
        const result = await executePlaybook('competitor-takedown-daily');
        
        console.log('Result Success:', result.success);
        console.log('Result Message:', result.message);
        console.log('Logs:', JSON.stringify(result.logs, null, 2));

    } catch (e) {
        console.error('Playbook Exception:', e);
    }
}

verifyPlaybook().catch(console.error);
