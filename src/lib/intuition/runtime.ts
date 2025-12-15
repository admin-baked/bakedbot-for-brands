
import { WorkOrder, Artifact, Trace, TraceStep, AgentId } from '@/types/intuition-os';
import { DomainMemory } from './domain-memory';
import { v4 as uuidv4 } from 'uuid'; // Assuming we have uuid or similar, else simple random
import { logger } from '@/lib/logger';

export class AgentKernel {
    private agentId: AgentId;
    private memory: DomainMemory;

    constructor(agentId: AgentId) {
        this.agentId = agentId;
        this.memory = new DomainMemory(agentId);
    }

    /**
     * Main entry point: Executes a WorkOrder using Intuition OS.
     */
    async run(workOrder: WorkOrder): Promise<Artifact> {
        const start = Date.now();
        const traceSteps: TraceStep[] = [];
        let method: 'system_1_heuristic' | 'system_2_planning' = 'system_2_planning';
        let output: Artifact;

        logger.info(`[Kernel:${this.agentId}] Received WorkOrder: ${workOrder.goal}`);

        // Phase 1: Check System 1 (Fast Path)
        const memoryResult = await this.system1_check(workOrder);

        if (memoryResult) {
            method = 'system_1_heuristic';
            logger.info(`[Kernel:${this.agentId}] System 1 Hit! adapting past trace.`);
            output = this.executeHeuristic(workOrder, memoryResult);
            traceSteps.push({
                stepId: uuidv4(),
                action: 'system_1_recall',
                input: { goal: workOrder.goal },
                output: { similarTraceId: memoryResult.id },
                timestamp: new Date()
            });
        } else {
            // Phase 2: System 2 (Slow Path)
            method = 'system_2_planning';
            logger.info(`[Kernel:${this.agentId}] System 1 Miss. Engaging System 2 Planner.`);
            output = await this.executePlanner(workOrder, traceSteps);
        }

        // Phase 3: Save Trace (Domain Memory)
        const end = Date.now();
        const trace: Trace = {
            id: uuidv4(),
            workOrderId: workOrder.id,
            method,
            steps: traceSteps,
            outputArtifactId: output.id,
            durationMs: end - start,
            startedAt: new Date(start),
            completedAt: new Date(end)
        };

        await this.memory.saveTrace(trace);

        return output;
    }

    /**
     * System 1: Checks for similar past successes.
     */
    private async system1_check(workOrder: WorkOrder): Promise<Trace | null> {
        const similar = await this.memory.findSimilarTraces(workOrder);
        // Simple confidence check: do we have ANY match?
        if (similar.length > 0) {
            return similar[0]; // Return the best match
        }
        return null;
    }

    private executeHeuristic(workOrder: WorkOrder, pastTrace: Trace): Artifact {
        // Logic to adapt past artifact to new context
        // For V1, we simply return a "Replica" artifact
        return {
            id: uuidv4(),
            type: 'text',
            content: `[System 1 Result] Replicated from trace ${pastTrace.id} for goal: ${workOrder.goal}`,
            createdBy: this.agentId,
            createdAt: new Date()
        };
    }

    /**
     * System 2: Decomposes task and executes step-by-step.
     */
    private async executePlanner(workOrder: WorkOrder, traceLog: TraceStep[]): Promise<Artifact> {
        // 1. Plan
        traceLog.push({
            stepId: uuidv4(),
            action: 'plan_task',
            input: workOrder.goal,
            output: 'Plan: Step 1 -> Step 2',
            timestamp: new Date()
        });

        // 2. Execute (Mocked)
        // In real life, this would call Tools, LLMs, etc.
        const resultText = `[System 2 Result] Executed fresh plan for: ${workOrder.goal}`;

        return {
            id: uuidv4(),
            type: 'text',
            content: resultText,
            createdBy: this.agentId,
            createdAt: new Date()
        };
    }
}
