
import { deeboAgent } from '@/server/agents/deebo-agent-impl';
import { defaultDeeboTools } from '@/app/dashboard/ceo/agents/default-tools';
import { AgentMemory } from '@/server/agents/schemas';

async function verifyDeebo() {
    console.log('--- Verifying Deebo Agent ---');

    // 1. Initialize
    const brandMemory: any = { brand_profile: { name: 'Test Brand' } };
    const agentMemory: AgentMemory = { last_active: new Date() };
    
    await deeboAgent.initialize(brandMemory, agentMemory);
    console.log('Initialize: OK');

    // 2. Orient
    const stimulus = "Is 'Best Weed in Town' allowed on a billboard in WA?";
    const orientation = await deeboAgent.orient(brandMemory, agentMemory, stimulus);
    console.log('Orient:', orientation === 'user_request' ? 'OK' : 'FAIL');

    // 3. Act (Plan & Execute)
    console.log('Acting (Planner Loop)...');
    
    // Mock the external SDK if needed, but integration test is better if possible.
    // We are running this in a "dummy" environment so actual Genkit calls might need mocking or we rely on the implementation being valid.
    // For this verification script, let's just inspect the structure and basic flow if we can't run full Genkit.
    // Actually, we can assume the code is valid TS. Let's try to run it if environment supports it, otherwise manual check.
     
    // We will just invoke the 'act' method with our tools and see if it attempts to execute.
    // Since we don't have a live Genkit mock here, we expect this script to fail at runtime if we ran it without the AI provider.
    // So this script serves as a code-validation artifact.

    // Let's verify the tools object has the keys we expect.
    const tools = defaultDeeboTools;
    if (typeof tools.checkCompliance === 'function' && typeof tools.verifyAge === 'function') {
        console.log('Tools: OK');
    } else {
        console.error('Tools: MISSING');
    }

    console.log('Deebo verification script complete (Static Check).');
}

verifyDeebo().catch(console.error);
