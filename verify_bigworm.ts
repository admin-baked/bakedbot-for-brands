
import { bigWormAgent } from '@/server/agents/bigworm';
import { defaultBigWormTools } from '@/app/dashboard/ceo/agents/default-tools';
import { AgentMemory } from '@/server/agents/schemas';

async function verifyBigWorm() {
    console.log('--- Verifying Big Worm Agent ---');

    // 1. Initialize
    const brandMemory: any = { brand_profile: { name: 'Test Brand' } };
    const agentMemory: AgentMemory = { last_active: new Date() };
    
    await bigWormAgent.initialize(brandMemory, agentMemory);
    console.log('Initialize: OK');

    // 2. Orient
    const stimulus = "Run a deep trend analysis on Q3 sales.";
    const orientation = await bigWormAgent.orient(brandMemory, agentMemory, stimulus);
    console.log('Orient:', orientation === 'user_request' ? 'OK' : 'FAIL');

    // 3. Act (Plan & Execute)
    console.log('Acting (Planner Loop)...');

    // We can't easily mock the AI planning here without a mock provider, 
    // but we can verify the Tool interface and Sidecar connectivity.

    console.log('Testing Tool: pythonAnalyze (Test Action)...');
    try {
        const result = await defaultBigWormTools.pythonAnalyze('test', { foo: 'bar' });
        console.log('Sidecar Result:', JSON.stringify(result));
        if (result.status === 'success' && result.data_received?.foo === 'bar') {
             console.log('Sidecar connectivity: PASS');
        } else {
             console.error('Sidecar connectivity: FAIL');
        }
    } catch (e) {
        console.error('Sidecar Exception:', e);
    }

    console.log('Big Worm verification script complete.');
}

verifyBigWorm().catch(console.error);
