/**
 * YAML Playbook System
 * Persistent automation workflows created by agents
 */

import { AgentTrigger } from './agent-config';

export type PlaybookStatus = 'draft' | 'active' | 'paused' | 'archived';

export type PlaybookCategory = 'intel' | 'marketing' | 'ops' | 'seo' | 'reporting' | 'compliance' | 'custom';
export type TriggerType = 'manual' | 'schedule' | 'event';

export interface PlaybookTrigger {
    type: TriggerType;
    cron?: string;           // For schedule type
    timezone?: string;       // For schedule type
    eventName?: string;      // For event type (e.g., 'lead.created', 'page.claimed')
}

export interface PlaybookStep {
    id: string;              // Unique step ID for ordering
    action: string;
    params: Record<string, unknown>;
    agent?: string;          // For delegation
    condition?: string;      // Optional if condition
    label?: string;          // Human-readable step name
}

export interface Playbook {
    id: string;
    name: string;
    description: string;
    status: PlaybookStatus;

    // Agent & Category
    agent: string;           // Responsible agent (smokey, craig, pops, etc.)
    category: PlaybookCategory;
    icon?: string;           // Lucide icon name

    // YAML source (optional - for advanced users)
    yaml?: string;

    // Parsed structure
    triggers: PlaybookTrigger[];
    steps: PlaybookStep[];

    // Ownership & Access
    ownerId: string;         // User who owns this playbook
    ownerName?: string;      // Display name for owner
    isCustom: boolean;       // true = user-created, false = system template
    templateId?: string;     // If cloned from a template

    // Approval
    requiresApproval: boolean; // Auto-detected based on customer-facing email steps

    // Execution stats
    lastRunAt?: Date;
    runCount: number;
    successCount: number;
    failureCount: number;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;       // Original creator (may differ from owner)
    orgId: string;

    // Version control
    version: number;
}

export interface PlaybookVersion {
    playbookId: string;
    version: number;
    yaml: string;
    changedBy: string;
    changedAt: Date;
    changeNote?: string;
}

export interface PlaybookRun {
    id: string;
    playbookId: string;
    triggerId: string;
    triggerType: string;

    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;

    steps: {
        action: string;
        status: 'pending' | 'running' | 'completed' | 'failed';
        result?: unknown;
        error?: string;
        durationMs?: number;
    }[];
}

// Example YAML structure for reference:
// ---
// name: Weekly Competitor Watch
// triggers:
//   - type: schedule
//     cron: "0 9 * * 1"
// steps:
//   - action: delegate
//     agent: researcher
//     task: Scan competitor prices
//   - action: email
//     to: "{{user.email}}"
//     subject: Weekly Report
