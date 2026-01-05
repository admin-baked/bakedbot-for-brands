
import { GraphExecutor } from '@/server/services/graph/executor';

describe('GraphExecutor', () => {
    it('should execute a linear chain of nodes', async () => {
        const graph = new GraphExecutor({ count: 0 });

        graph.addNode('start', async (state) => ({ count: state.count + 1 }));
        graph.addNode('step2', async (state) => ({ count: state.count + 2 }));
        
        graph.addEdge('start', 'step2');
        graph.addEdge('step2', '__END__');
        graph.setEntryPoint('start');

        const result = await graph.execute(5);
        expect(result.finalState.count).toBe(3);
        expect(result.history).toEqual(['start', 'step2']);
    });

    it('should handle cyclic loops and state updates', async () => {
        const graph = new GraphExecutor({ loops: 0 });

        // A node that increments loops
        graph.addNode('check', async (state) => ({ loops: state.loops + 1 }));
        
        // A branching exit condition
        graph.addEdge('check', (state) => {
            if (state.loops < 3) return 'check'; // Loop back
            return '__END__';
        });

        graph.setEntryPoint('check');

        const result = await graph.execute(10);
        expect(result.finalState.loops).toBe(3);
        // History should show: check -> check -> check (3 times execution)
    });

    it('should stop after max steps', async () => {
        const graph = new GraphExecutor();
        graph.addNode('loop', async () => ({}));
        graph.addEdge('loop', 'loop'); // Infinite loop
        graph.setEntryPoint('loop');

        const result = await graph.execute(5);
        expect(result.history.length).toBe(5);
    });

    it('should default start execution at first added node if no entry point set', async () => {
         const graph = new GraphExecutor({val: 1});
         graph.addNode('first', async (state) => ({val: 2}));
         graph.addEdge('first', '__END__');
         const result = await graph.execute();
         expect(result.finalState.val).toBe(2);
    });
});
