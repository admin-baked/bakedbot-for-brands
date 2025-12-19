import { runAgentChat } from '../src/app/dashboard/ceo/agents/actions';

async function test() {
    try {
        console.log('Testing "Lets research our market for product gaps"...');
        const result = await runAgentChat("Lets research our market for product gaps");
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Fatal Error:', e);
    }
}

test();
