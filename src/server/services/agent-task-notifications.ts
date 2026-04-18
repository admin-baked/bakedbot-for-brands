/**
 * Agent Task Notifications — Slack Block Kit lifecycle cards
 *
 * Posts real-time stoplight cards to #agent-audit as tasks are created,
 * stepped through, completed, or failed. Cards are edited in-place so
 * the channel stays clean.
 *
 * Interactive feedback buttons (👍 👎 🚩) hit the Slack interactions
 * webhook, which writes to agent_tasks + agent_learning_log.
 */

import { logger } from '@/lib/logger';
import { elroySlackService } from '@/server/services/communications/slack';
import type { AgentTask, TaskStep, AgentTaskStoplight } from '@/types/agent-task';
import { STOPLIGHT_EMOJI } from '@/types/agent-task';

const AUDIT_CHANNEL = (process.env.SLACK_CHANNEL_AGENT_AUDIT || 'agent-audit').replace(/^#/, '');

// ============================================================================
// Block builders
// ============================================================================

function stoplightLabel(stoplight: AgentTaskStoplight): string {
    const labels: Record<AgentTaskStoplight, string> = {
        gray:   'QUEUED',
        yellow: 'RUNNING',
        orange: 'ESCALATED',
        purple: 'REVIEW',
        green:  'COMPLETE',
        red:    'FAILED',
    };
    return labels[stoplight];
}

function priorityEmoji(priority: AgentTask['priority']): string {
    const map: Record<AgentTask['priority'], string> = {
        critical: '🚨',
        high:     '🔴',
        normal:   '🔵',
        low:      '⚪',
    };
    return map[priority];
}

function formatSteps(steps: TaskStep[]): string {
    if (!steps.length) return '_No steps logged yet_';
    return steps
        .map(s => {
            const icon = s.status === 'complete' ? '✅' :
                         s.status === 'failed'   ? '❌' :
                         s.status === 'running'  ? '⏳' : '○';
            const note = s.notes ? ` — ${s.notes}` : '';
            return `${icon} ${s.label}${note}`;
        })
        .join('\n');
}

function elapsedSince(isoString?: string): string {
    if (!isoString) return '';
    const ms = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
}

function buildTaskBlocks(task: AgentTask): Record<string, unknown>[] {
    const stoplight = task.stoplight;
    const emoji = STOPLIGHT_EMOJI[stoplight];
    const label = stoplightLabel(stoplight);
    const pEmoji = priorityEmoji(task.priority);
    const agent = task.assignedTo || task.reportedBy;
    const elapsed = elapsedSince(task.startedAt || task.createdAt);

    const blocks: Record<string, unknown>[] = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${emoji} ${label} — ${task.title}`,
                emoji: true,
            },
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*Agent*\n${agent}` },
                { type: 'mrkdwn', text: `*Priority*\n${pEmoji} ${task.priority}` },
                { type: 'mrkdwn', text: `*Category*\n${task.category}` },
                { type: 'mrkdwn', text: `*Started*\n${elapsed}` },
            ],
        },
    ];

    // Step log
    if (task.steps && task.steps.length > 0) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Progress*\n${formatSteps(task.steps)}`,
            },
        });
    }

    // Error snippet on failure
    if ((stoplight === 'red' || stoplight === 'orange') && task.errorSnippet) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Error*\n\`\`\`${task.errorSnippet.slice(0, 300)}\`\`\``,
            },
        });
    }

    // Resolution note on complete
    if (stoplight === 'green' && task.resolutionNote) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Result*\n${task.resolutionNote.slice(0, 400)}`,
            },
        });
    }

    // Human feedback (already given)
    if (task.humanFeedback) {
        const ratingEmoji = task.humanFeedback.rating === 'approved' ? '👍' :
                            task.humanFeedback.rating === 'rejected' ? '👎' : '🚩';
        blocks.push({
            type: 'context',
            elements: [{
                type: 'mrkdwn',
                text: `${ratingEmoji} *Feedback from ${task.humanFeedback.reviewedBy}:* ${task.humanFeedback.note || task.humanFeedback.rating}`,
            }],
        });
    } else if (stoplight === 'green' || stoplight === 'red' || stoplight === 'orange') {
        // Feedback buttons — only on terminal/escalated states
        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'actions',
            block_id: `task_feedback_${task.id}`,
            elements: [
                {
                    type: 'button',
                    text: { type: 'plain_text', text: '👍 Approve', emoji: true },
                    style: 'primary',
                    action_id: 'task_feedback_approve',
                    value: JSON.stringify({ taskId: task.id, rating: 'approved' }),
                },
                {
                    type: 'button',
                    text: { type: 'plain_text', text: '🚩 Needs Work', emoji: true },
                    action_id: 'task_feedback_flag',
                    value: JSON.stringify({ taskId: task.id, rating: 'needs_improvement' }),
                },
                {
                    type: 'button',
                    text: { type: 'plain_text', text: '👎 Reject', emoji: true },
                    style: 'danger',
                    action_id: 'task_feedback_reject',
                    value: JSON.stringify({ taskId: task.id, rating: 'rejected' }),
                },
            ],
        });
    }

    // Footer
    blocks.push({
        type: 'context',
        elements: [{
            type: 'mrkdwn',
            text: `Task \`${task.id}\` · ${task.triggeredBy || 'manual'} · <https://bakedbot.ai/dashboard/admin/agent-board|View Board>`,
        }],
    });

    return blocks;
}

// ============================================================================
// Public API
// ============================================================================

async function ensureAuditChannel(): Promise<string> {
    const existing = await elroySlackService.findChannelByName(AUDIT_CHANNEL);
    if (existing?.id) {
        await elroySlackService.joinChannel(existing.id);
        return existing.id;
    }
    const created = await elroySlackService.createChannel(AUDIT_CHANNEL);
    if (created?.id) {
        await elroySlackService.joinChannel(created.id);
        return created.id;
    }
    return AUDIT_CHANNEL;
}

/**
 * Post a new task card to #agent-audit. Returns the Slack message ts
 * so it can be stored on the task for in-place updates.
 */
export async function postTaskCard(task: AgentTask): Promise<string | null> {
    try {
        const channelId = await ensureAuditChannel();
        const blocks = buildTaskBlocks(task);
        const fallback = `${STOPLIGHT_EMOJI[task.stoplight]} ${stoplightLabel(task.stoplight)} — ${task.title} (${task.assignedTo || task.reportedBy})`;
        const result = await elroySlackService.postMessage(channelId, fallback, blocks);

        if (!result.sent) {
            logger.warn('[AgentTaskNotifications] Failed to post card', { taskId: task.id, error: result.error });
            return null;
        }

        return typeof result.ts === 'string' ? result.ts : null;
    } catch (err) {
        logger.warn('[AgentTaskNotifications] postTaskCard threw', {
            taskId: task.id,
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

/**
 * Update an existing task card in-place (same message ts).
 * Falls back to posting a new card if ts is missing.
 */
export async function updateTaskCard(task: AgentTask): Promise<void> {
    if (!task.slackTs) {
        await postTaskCard(task);
        return;
    }

    try {
        const channelId = await ensureAuditChannel();
        const blocks = buildTaskBlocks(task);
        const fallback = `${STOPLIGHT_EMOJI[task.stoplight]} ${stoplightLabel(task.stoplight)} — ${task.title}`;
        await elroySlackService.updateMessage(channelId, task.slackTs, fallback, blocks);
    } catch (err) {
        logger.warn('[AgentTaskNotifications] updateTaskCard threw', {
            taskId: task.id,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
