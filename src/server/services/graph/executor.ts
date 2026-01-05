
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Graph Executor (Digital Worker V2)
 * 
 * Implements a State Graph architecture for agent workflows.
 * Replaces linear chains with nodes and edges.
 */

export interface GraphState {
    [key: string]: any;
}

export interface GraphNode {
    id: string;
    execute: (state: GraphState) => Promise<Partial<GraphState>>;
}

export type EdgeCondition = (state: GraphState) => string; // Returns next Node ID

export class GraphExecutor {
    private nodes = new Map<string, GraphNode>();
    private edges = new Map<string, EdgeCondition>();
    private state: GraphState = {};
    private startNodeId: string | null = null;
    private endNodeId: string = '__END__';

    constructor(initialState: GraphState = {}) {
        this.state = initialState;
    }

    addNode(id: string, action: (state: GraphState) => Promise<Partial<GraphState>>) {
        this.nodes.set(id, { id, execute: action });
        if (!this.startNodeId) this.startNodeId = id; // Default start is first node
        return this;
    }

    addEdge(fromNodeId: string, toNodeIdOrCondition: string | EdgeCondition) {
        if (typeof toNodeIdOrCondition === 'string') {
            this.edges.set(fromNodeId, () => toNodeIdOrCondition);
        } else {
            this.edges.set(fromNodeId, toNodeIdOrCondition);
        }
        return this;
    }

    setEntryPoint(nodeId: string) {
        this.startNodeId = nodeId;
        return this;
    }

    async execute(maxSteps = 20) {
        if (!this.startNodeId) throw new Error("Graph has no entry point.");
        
        let currentNodeId = this.startNodeId;
        let stepCount = 0;
        const history: string[] = [];

        logger.info(`[Graph] Starting execution at ${currentNodeId}`);

        while (currentNodeId !== this.endNodeId && stepCount < maxSteps) {
            history.push(currentNodeId);
            const node = this.nodes.get(currentNodeId);
            
            if (!node) {
                throw new Error(`Node '${currentNodeId}' not found.`);
            }

            try {
                // Execute Node
                logger.info(`[Graph] Executing Node: ${currentNodeId}`);
                const output = await node.execute({ ...this.state });
                
                // Update State (Merge)
                this.state = { ...this.state, ...output };

                // Determine Next Node
                const edge = this.edges.get(currentNodeId);
                if (edge) {
                    currentNodeId = edge(this.state);
                } else {
                    logger.info(`[Graph] No outgoing edge from ${currentNodeId}. Ending.`);
                    currentNodeId = this.endNodeId;
                }

                stepCount++;

            } catch (e: any) {
                logger.error(`[Graph] Error in node ${currentNodeId}:`, e);
                // Simple error handling: Stop or loop? 
                // For V2, we just throw. V3 could include error edges.
                throw e;
            }
        }

        if (stepCount >= maxSteps) {
            logger.warn(`[Graph] Execution required maximum steps (${maxSteps}). Terminating.`);
        }

        return {
            finalState: this.state,
            history
        };
    }
}
