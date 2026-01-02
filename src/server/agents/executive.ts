
import { AgentImplementation } from './harness';
import { ExecutiveMemory } from './schemas';
import { logger } from '@/lib/logger';

export interface ExecutiveTools {
  // Common tools for the executive floor
  generateSnapshot?(query: string, context: any): Promise<string>;
  delegateTask?(personaId: string, task: string, context?: any): Promise<any>;
  broadcast?(message: string, channels: string[], recipients: string[]): Promise<any>;
}

/**
 * Generic Executive Agent Implementation
 * Reusable for Leo, Jack, Linus, Glenda, Mike
 */
export const executiveAgent: AgentImplementation<ExecutiveMemory, ExecutiveTools> = {
  agentName: 'executive_base',

  async initialize(brandMemory, agentMemory) {
    logger.info(`[Executive] Initializing for ${brandMemory.brand_profile.name}...`);
    
    // Ensure objectives tracking is initialized from brand memory if empty
    if (!agentMemory.objectives || agentMemory.objectives.length === 0) {
        agentMemory.objectives = [...brandMemory.priority_objectives];
    }
    
    return agentMemory;
  },

  async orient(brandMemory, agentMemory, stimulus) {
    // Executive agents are primarily reactive to Martez/Jack (CEO/CRO) 
    // or proactive based on global objectives.
    
    if (stimulus && typeof stimulus === 'string') {
        return 'chat_response';
    }
    
    // Strategy: Check if the $100k MRR objective needs an update
    const mrrObjective = agentMemory.objectives.find(o => o.description.includes('MRR') || o.id === 'mrr_goal');
    if (mrrObjective && mrrObjective.status === 'active') {
        return 'mrr_check';
    }

    return null;
  },

  async act(brandMemory, agentMemory, targetId, tools: ExecutiveTools, stimulus?: string) {
    const brandName = brandMemory.brand_profile.name;
    
    if (targetId === 'chat_response' && stimulus) {
        // High-level orchestration prompt
        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'chat_response',
                result: `I am processing your request regarding: "${stimulus}". I will coordinate with the necessary squad members to execute.`,
                next_step: 'execute_orchestration',
                metadata: { stimulus, brandName }
            }
        };
    }

    if (targetId === 'mrr_check') {
        return {
            updatedMemory: agentMemory,
            logEntry: {
                action: 'monitor_growth',
                result: "Currently monitoring the path to $100k MRR. Aligning Jack (CRO) and Glenda (CMO) on the National Discovery Layer push.",
                next_step: 'await_data',
                metadata: { objective: '100k_mrr' }
            }
        };
    }

    return {
        updatedMemory: agentMemory,
        logEntry: {
            action: 'idle',
            result: 'Awaiting instructions or strategic signals.',
            next_step: 'wait',
            metadata: {}
        }
    };
  }
};
