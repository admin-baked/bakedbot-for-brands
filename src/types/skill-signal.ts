/**
 * Skill Signal Types
 *
 * Typed discriminated union for all events that can trigger a skill invocation.
 * Mirrors the playbook TriggerSpec pattern from playbook-v2.ts but is
 * skill-specific and extends it with agent-originated signal kinds.
 */

import type { ProactiveWorkflowKey } from '@/types/proactive';

// ============ Signal Kinds ============

export type SkillSignalKind =
    | 'playbook_trigger'    // A playbook step fires a skill
    | 'proactive_alert'     // A proactive monitor detected something worth acting on
    | 'scheduled_refresh'   // Recurring cron (daily ops review, weekly CI report)
    | 'user_intent'         // Human asked for something explicitly
    | 'agent_handoff';      // One agent hands off to a skill owned by another agent

// ============ Per-kind payload shapes ============

export interface PlaybookTriggerSignal {
    kind: 'playbook_trigger';
    orgId: string;
    triggeredBy: string;            // userId or 'system'
    playbookId: string;
    stepId: string;
    targetSkill: string;            // e.g., 'craig-campaign'
    playbookContext?: Record<string, unknown>;
}

export interface ProactiveAlertSignal {
    kind: 'proactive_alert';
    orgId: string;
    triggeredBy: string;
    workflowKey: ProactiveWorkflowKey;
    alertId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    targetSkill: string;
    alertData?: Record<string, unknown>;
}

export interface ScheduledRefreshSignal {
    kind: 'scheduled_refresh';
    orgId: string;
    triggeredBy: 'cron';
    targetSkill: string;            // e.g., 'daily-dispensary-ops-review'
    scheduleId?: string;
    dateContext?: string;           // ISO date, e.g., '2026-03-31'
}

export interface UserIntentSignal {
    kind: 'user_intent';
    orgId: string;
    triggeredBy: string;            // userId
    targetSkill: string;
    threadId?: string;              // Inbox thread if invoked from chat
    userMessage?: string;           // The raw request that triggered routing
    intentContext?: Record<string, unknown>;
}

export interface AgentHandoffSignal {
    kind: 'agent_handoff';
    orgId: string;
    triggeredBy: string;            // Agent name (e.g., 'craig')
    fromAgent: string;
    targetSkill: string;
    parentArtifactId?: string;      // Artifact that triggered the handoff
    handoffReason?: string;
    handoffContext?: Record<string, unknown>;
}

// ============ Discriminated union ============

export type SkillSignal =
    | PlaybookTriggerSignal
    | ProactiveAlertSignal
    | ScheduledRefreshSignal
    | UserIntentSignal
    | AgentHandoffSignal;

// ============ Context bundle (assembled for prompt building) ============

export interface SkillResolutionContext {
    orgId: string;
    signal: SkillSignal;
    skillName: string;
    agentOwner: string;
    orgProfile?: Record<string, unknown>;
    businessObjects: Record<string, unknown>;
    recentArtifacts?: unknown[];
    assembledAt: string;            // ISO timestamp
}
