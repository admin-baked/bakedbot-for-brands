
import { runAgentChat } from '../src/app/dashboard/ceo/agents/actions';

async function main() {
    console.log('--- TESTING CHAT ERROR ---');
    try {
        const result = await runAgentChat('Lets research Springbig');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e: any) {
        console.error('Caught error in main:', e);
        console.error(e.stack);
    }
}

main();
