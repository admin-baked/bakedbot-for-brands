/**
 * YAML Playbook System
 * Persistent automation workflows created by agents
 */

import { AgentTrigger } from './agent-config';

export type PlaybookStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface PlaybookStep {
    action: string;
    params: Record<string, unknown>;
    agent?: string; // For delegation
    condition?: string; // Optional if condition
}

export interface Playbook {
    id: string;
    name: string;
    description: string;
    status: PlaybookStatus;

    // YAML source
    yaml: string;

    // Parsed structure
    triggers: AgentTrigger[];
    steps: PlaybookStep[];

    // Execution stats
    lastRunAt?: Date;
    runCount: number;
    successCount: number;
    failureCount: number;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
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
