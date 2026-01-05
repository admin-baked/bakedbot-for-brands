
import { GraphExecutor, GraphNode } from '@/server/services/graph/executor';

async function verifyGraph() {
    console.log('--- Verifying Graph Executor (V2 Architecture) ---');

    const graph = new GraphExecutor({ retryCount: 0 });

    // Node 1: Ezal Scan
    graph.addNode('ezal_scan', async (state) => {
        console.log('[Node: Ezal] Scanning competitors...');
        const successful = Math.random() > 0.3; // 70% chance of success
        return { 
            ezal_success: successful,
            scan_data: successful ? ['Pricing A', 'Pricing B'] : null
        };
    });

    // Node 2: Retry Logic (The "Loop")
    graph.addNode('check_retry', async (state) => {
        console.log(`[Node: Retry] Success? ${state.ezal_success}, Retries: ${state.retryCount}`);
        if (!state.ezal_success) {
            return { retryCount: state.retryCount + 1 };
        }
        return {};
    });

    // Node 3: Big Worm Analysis
    graph.addNode('bigworm_analysis', async (state) => {
        console.log('[Node: Big Worm] Analyzing data:', state.scan_data);
        return { strategy: 'Under-cut prices by 10%' };
    });

    // Node 4: Success End
    graph.addNode('success_end', async (state) => {
        console.log('Work complete. Strategy:', state.strategy);
        return { status: 'complete' };
    });

    // Node 5: Failure End
    graph.addNode('fail_end', async (state) => {
        console.error('Work failed after max retries.');
        return { status: 'failed' };
    });


    // --- Edges ---

    // Ezal -> Check Logic
    graph.addEdge('ezal_scan', 'check_retry');

    // Check Logic -> Branch
    graph.addEdge('check_retry', (state) => {
        if (state.ezal_success) {
            return 'bigworm_analysis';
        }
        if (state.retryCount > 2) {
            return 'fail_end'; // Give up
        }
        console.log('>>> Looping back to Ezal...');
        return 'ezal_scan'; // Loop back
    });

    // Big Worm -> Success
    graph.addEdge('bigworm_analysis', 'success_end');
    
    // Ends
    graph.addEdge('success_end', '__END__');
    graph.addEdge('fail_end', '__END__');

    // Start
    graph.setEntryPoint('ezal_scan');

    // Execute
    try {
        const result = await graph.execute(10); // Max 10 steps
        console.log('Graph Final State:', result.finalState);

        if (result.finalState.status === 'complete' || result.finalState.status === 'failed') {
            console.log('PASS: Graph executed to completion state.');
        }

    } catch (e) {
        console.error('Graph Execution Error:', e);
    }
}

verifyGraph().catch(console.error);
