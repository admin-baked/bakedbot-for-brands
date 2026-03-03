/**
 * Delegation Tool Definitions
 *
 * Tool definition + factory for agent-to-agent delegation.
 * Any agent can use `delegateToAgent` to request work from another agent.
 */

import { z } from 'zod';
import { delegateToAgent, generateDelegationId } from '@/server/services/agent-delegation';
import type { DelegationPriority } from '@/types/agent-delegation';

// ---------------------------------------------------------------------------
// Tool Definition (for Claude tool-calling)
// ---------------------------------------------------------------------------

export const delegationToolDefs = [
    {
        name: 'delegateToAgent',
        description: [
            'Delegate a task to another specialized agent and get the result.',
            'Use when another agent has expertise you lack.',
            'Available agents: deebo (compliance), craig (marketing), smokey (products),',
            'pops (analytics), ezal (competitive intel), money_mike (finance),',
            'big_worm (research), linus (engineering), leo (operations).',
        ].join(' '),
        schema: z.object({
            toAgent: z.string().describe('Target agent name (e.g., "deebo", "craig", "pops")'),
            task: z.string().describe('What you need the agent to do — be specific'),
            context: z.record(z.unknown()).optional().describe('Structured context data (orgId, content, etc.)'),
            priority: z.enum(['low', 'normal', 'high', 'critical']).optional().describe('Task priority (default: normal)'),
        }),
    },
];

// ---------------------------------------------------------------------------
// Tool Implementation Factory
// ---------------------------------------------------------------------------

/**
 * Create delegation tool implementations for a specific agent.
 *
 * @param fromAgent - The name of the agent using this tool
 * @param orgId - Optional org context
 */
export function makeDelegationToolsImpl(fromAgent: string, orgId?: string) {
    return {
        delegateToAgent: async (args: {
            toAgent: string;
            task: string;
            context?: Record<string, unknown>;
            priority?: DelegationPriority;
        }) => {
            const response = await delegateToAgent({
                id: generateDelegationId(),
                fromAgent,
                toAgent: args.toAgent,
                task: args.task,
                context: { ...args.context, orgId },
                priority: args.priority,
            });

            // Return a simplified result for the agent to consume
            if (response.status === 'completed') {
                return {
                    success: true,
                    agentResponse: response.result,
                    fromAgent: response.fromAgent,
                    durationMs: response.durationMs,
                };
            }

            return {
                success: false,
                error: response.error ?? `Delegation ${response.status}`,
                status: response.status,
                durationMs: response.durationMs,
            };
        },
    };
}
