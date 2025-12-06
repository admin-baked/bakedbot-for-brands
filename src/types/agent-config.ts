export type TriggerType = 'schedule' | 'webhook' | 'event' | 'manual';

export interface AgentTrigger {
    id: string;
    type: TriggerType;
    name: string;
    config: {
        cron?: string; // For schedule
        timezone?: string;
        eventPattern?: string; // For event listeners
        webhookPath?: string; // For webhooks
        webhookSecret?: string;
    };
    enabled: boolean;
    lastRunAt?: Date;
}

export type AgentRole = 'main' | 'subagent' | 'specialist';
export type ModelLevel = 'standard' | 'advanced' | 'expert' | 'genius';

export interface AgentConfigV2 {
    id: string;
    name: string;
    role: AgentRole;
    description: string;
    avatar?: string;

    // Intelligence
    modelLevel: ModelLevel;
    instructions: string; // System prompt / persona

    // Capabilities
    triggers: AgentTrigger[]; // Multiple triggers allowed
    subagents: string[]; // IDs of subagents this agent can delegate to
    tools: string[]; // Allowed tool IDs
    knowledgeBases: string[];

    // State
    status: 'active' | 'paused' | 'draft';
    createdAt: Date;
    updatedAt: Date;

    // Organization
    orgId: string;
    creatorId: string;
}
