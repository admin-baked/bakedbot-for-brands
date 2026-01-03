
import { IntentCommit } from './schema';
import { saveIntentCommit } from './storage';

/**
 * Tool: intention.askClarification
 * Description: Explicitly asks the user for clarification when confidence is low.
 */
export async function askClarification(question: string, context: string[]): Promise<{ status: string, question: string }> {
    // In a real system, this might trigger a specific UI state or "halt" the agent.
    // For now, it returns a structured signal that the Agent Runner can interpret to pause and ask.
    return {
        status: 'clarification_requested',
        question: question
    };
}

/**
 * Tool: intention.createCommit
 * Description: Agent formally commits to a plan.
 */
export async function createCommit(
    tenantId: string, 
    agentId: string, 
    commit: Omit<IntentCommit, 'id' | 'timestamp' | 'status'>
) {
    const fullCommit: IntentCommit = {
        ...commit,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        status: 'committed',
        agentId,
        userQuery: commit.userQuery || 'Agent-initiated'
    };

    await saveIntentCommit(tenantId, fullCommit);

    return {
        status: 'success',
        commitId: fullCommit.id,
        message: 'Intent formally committed. Proceed with execution.'
    };
}
