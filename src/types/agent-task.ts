/**
 * Agent Task Queue — Types
 *
 * Lightweight task handoff between agents. Stored as markdown-friendly
 * documents in Firestore `agent_tasks` collection so both humans and
 * agents can read them naturally.
 *
 * Design: tasks are filed by any agent/cron/CLI, claimed by Linus or
 * another builder agent, and resolved with a commit hash or note.
 */

// --- Status ---

export type AgentTaskStatus = 'open' | 'claimed' | 'in_progress' | 'escalated' | 'done' | 'wont_fix';

// --- Stoplight ---

/** Visual status for the board. Derived from status but can be overridden by agents. */
export type AgentTaskStoplight = 'gray' | 'yellow' | 'orange' | 'green' | 'red';

export function statusToStoplight(status: AgentTaskStatus): AgentTaskStoplight {
    switch (status) {
        case 'open':        return 'gray';
        case 'claimed':
        case 'in_progress': return 'yellow';
        case 'escalated':   return 'orange';
        case 'done':        return 'green';
        case 'wont_fix':    return 'red';
    }
}

export const STOPLIGHT_EMOJI: Record<AgentTaskStoplight, string> = {
    gray:   '⚪',
    yellow: '🟡',
    orange: '🟠',
    green:  '🟢',
    red:    '🔴',
};

// --- Step log ---

export interface TaskStep {
    label: string;
    status: 'pending' | 'running' | 'complete' | 'failed';
    completedAt?: string; // ISO string
    notes?: string;
}

// --- Human feedback ---

export interface TaskHumanFeedback {
    rating: 'approved' | 'needs_improvement' | 'rejected';
    note?: string;
    reviewedBy: string;  // Slack user ID or email
    reviewedAt: string;  // ISO string
}

// --- Priority ---

export type AgentTaskPriority = 'critical' | 'high' | 'normal' | 'low';

// --- Category (maps loosely to QABugArea but broader) ---

export type AgentTaskCategory =
    | 'bug'
    | 'feature'
    | 'refactor'
    | 'performance'
    | 'security'
    | 'compliance'
    | 'infra'
    | 'data'
    | 'agent_quality'
    | 'other';

// --- Core Interface ---

export interface AgentTask {
    id: string;
    title: string;

    /** Markdown body — the finding, context, steps to reproduce, suggestion */
    body: string;

    status: AgentTaskStatus;
    priority: AgentTaskPriority;
    category: AgentTaskCategory;

    /** Visual stoplight derived from status; agents may override */
    stoplight: AgentTaskStoplight;

    /** Who filed it: agent name, cron job name, or 'manual' */
    reportedBy: string;

    /** Who's working on it: 'linus', 'opencode', 'claude-code', or null */
    assignedTo: string | null;

    /** What triggered this task */
    triggeredBy?: 'cron' | 'slack' | 'user' | 'agent';

    /** Org context (for multi-tenant filtering on the board) */
    orgId?: string;

    /** Step-by-step execution log written by the agent as it works */
    steps?: TaskStep[];

    /** Human review/feedback written from the board or Slack */
    humanFeedback?: TaskHumanFeedback;

    /** Slack message ts for in-place card updates */
    slackTs?: string;

    /** Optional: file path most relevant to the task */
    filePath?: string;

    /** Optional: error message or log snippet */
    errorSnippet?: string;

    /** Optional: commit that introduced or relates to the issue */
    relatedCommit?: string;

    /** Optional: commit that resolved the issue */
    resolvedCommit?: string;

    /** Optional: resolution note (markdown) */
    resolutionNote?: string;

    // ── Revenue / Goal fields ──────────────────────────────────────────────
    /** Links this task to a revenue_goals doc */
    goalId?: string;
    /** Business agent who owns the outcome (marty, craig, smokey, etc.) */
    businessAgent?: string;
    /** Existing playbook to trigger when this task is claimed */
    playbookId?: string;
    /** Marty's estimate of revenue impact at decomp time */
    estimatedImpactUSD?: number;
    /** Actual impact filled in when task reaches done */
    resolvedImpactUSD?: number;

    /** Timestamps */
    createdAt: string;   // ISO string
    updatedAt: string;   // ISO string
    startedAt?: string;  // ISO string — when agent first sets in_progress
    claimedAt?: string;  // ISO string
    resolvedAt?: string; // ISO string
}

// --- Create input (what callers provide) ---

export interface CreateAgentTaskInput {
    title: string;
    body: string;
    priority?: AgentTaskPriority;
    category?: AgentTaskCategory;
    reportedBy: string;
    assignedTo?: string;
    triggeredBy?: AgentTask['triggeredBy'];
    orgId?: string;
    filePath?: string;
    errorSnippet?: string;
    relatedCommit?: string;
    // Revenue fields
    goalId?: string;
    businessAgent?: string;
    playbookId?: string;
    estimatedImpactUSD?: number;
}

// --- Rendered markdown (for dashboard display) ---

export function renderTaskMarkdown(task: AgentTask): string {
    const statusIcon: Record<AgentTaskStatus, string> = {
        open: '[ ]',
        claimed: '[~]',
        in_progress: '[>]',
        escalated: '[!]',
        done: '[x]',
        wont_fix: '[-]',
    };

    const priorityLabel: Record<AgentTaskPriority, string> = {
        critical: 'CRITICAL',
        high: 'HIGH',
        normal: 'NORMAL',
        low: 'LOW',
    };

    const lines: string[] = [
        `## ${statusIcon[task.status]} ${task.title}`,
        '',
        `**Priority:** ${priorityLabel[task.priority]} | **Category:** ${task.category} | **Status:** ${task.status}`,
        `**Filed by:** ${task.reportedBy} | **Assigned:** ${task.assignedTo || 'unassigned'}`,
    ];

    if (task.filePath) {
        lines.push(`**File:** \`${task.filePath}\``);
    }

    lines.push('', task.body);

    if (task.errorSnippet) {
        lines.push('', '```', task.errorSnippet, '```');
    }

    if (task.resolutionNote) {
        lines.push('', '---', '**Resolution:**', task.resolutionNote);
    }

    if (task.resolvedCommit) {
        lines.push(`**Fixed in:** \`${task.resolvedCommit}\``);
    }

    lines.push('', `*Created: ${task.createdAt}*`);

    return lines.join('\n');
}

/** Render a full task board as a single markdown document */
export function renderTaskBoardMarkdown(tasks: AgentTask[]): string {
    const open = tasks.filter(t => t.status === 'open');
    const claimed = tasks.filter(t => t.status === 'claimed' || t.status === 'in_progress');
    const done = tasks.filter(t => t.status === 'done' || t.status === 'wont_fix');

    const sections: string[] = ['# Agent Task Board', ''];

    if (open.length > 0) {
        sections.push(`## Open (${open.length})`, '');
        for (const t of open) {
            sections.push(renderTaskMarkdown(t), '');
        }
    }

    if (claimed.length > 0) {
        sections.push(`## In Progress (${claimed.length})`, '');
        for (const t of claimed) {
            sections.push(renderTaskMarkdown(t), '');
        }
    }

    if (done.length > 0) {
        sections.push(`## Completed (${done.length})`, '');
        for (const t of done.slice(0, 10)) { // Only show last 10 completed
            sections.push(renderTaskMarkdown(t), '');
        }
    }

    if (tasks.length === 0) {
        sections.push('*No tasks in queue. All clear.*');
    }

    return sections.join('\n');
}
