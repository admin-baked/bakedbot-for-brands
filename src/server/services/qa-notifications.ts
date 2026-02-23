/**
 * QA Notifications — Pinky Agent
 *
 * Sends Slack notifications to #qa-bugs channel for:
 * - New bugs filed (P0/P1 immediate, P2/P3 daily digest)
 * - Bug status transitions (fixed, verified, closed)
 * - Daily digest summaries
 *
 * Follows the same Slack Block Kit pattern as approval-notifications.ts
 */

import { logger } from '@/lib/logger';
import type { QABug, QAReport, QABugPriority, QABugArea } from '@/types/qa';
import { QA_PRIORITY_CONFIG, QA_AREA_CONFIG } from '@/types/qa';

// Uses dedicated #qa-bugs webhook if configured, falls back to general webhook
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_QA_BUGS || process.env.SLACK_WEBHOOK_URL;

const DASHBOARD_BASE_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ============================================================================
// PUBLIC NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Notify #qa-bugs when a new bug is filed.
 * P0/P1: immediate rich notification
 * P2/P3: lightweight notification (batched by daily digest in Phase 2)
 */
export async function notifyNewBug(bug: QABug): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        logger.warn('[QANotifications] SLACK_WEBHOOK_QA_BUGS not configured, skipping notification');
        return;
    }

    try {
        const priorityConfig = QA_PRIORITY_CONFIG[bug.priority];
        const areaConfig = QA_AREA_CONFIG[bug.area] || { label: bug.area, emoji: '🐛' };
        const dashboardUrl = `${DASHBOARD_BASE_URL}/dashboard/ceo?tab=qa&bugId=${bug.id}`;

        const isUrgent = bug.priority === 'P0' || bug.priority === 'P1';

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${priorityConfig.emoji} New Bug Filed — ${priorityConfig.label}`,
                    emoji: true
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*${bug.title}*`
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Area*\n${areaConfig.emoji} ${areaConfig.label}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Priority*\n${priorityConfig.emoji} ${bug.priority}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Environment*\n${bug.environment}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Reported By*\n${bug.reportedBy}`
                    }
                ]
            },
            ...(bug.steps.length > 0 ? [{
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Steps to Reproduce*\n${bug.steps.map((s, i) => `${i + 1}. ${s}`).join('\n').slice(0, 500)}`
                }
            }] : []),
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Expected*\n${bug.expected.slice(0, 200)}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Actual*\n${bug.actual.slice(0, 200)}`
                    }
                ]
            },
            ...(isUrgent ? [{
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '🔍 View Bug in Dashboard',
                            emoji: true
                        },
                        url: dashboardUrl,
                        action_id: 'view_qa_bug',
                        style: 'danger'
                    }
                ]
            }] : []),
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Bug ID: \`${bug.id}\` • ${bug.affectedOrgId ? `Org: ${bug.affectedOrgId} •` : ''} Filed at <!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|now>`
                    }
                ]
            }
        ];

        const title = `${priorityConfig.emoji} New ${bug.priority} Bug: ${bug.title}`;
        await sendQASlackNotification(blocks, title);

        logger.info('[QANotifications] New bug notification sent', { bugId: bug.id, priority: bug.priority });
    } catch (error) {
        logger.error('[QANotifications] Failed to send new bug notification', {
            error: error instanceof Error ? error.message : String(error),
            bugId: bug.id
        });
    }
}

/**
 * Notify #qa-bugs when a bug is marked as fixed (awaiting verification)
 */
export async function notifyBugFixed(bug: QABug): Promise<void> {
    if (!SLACK_WEBHOOK_URL) return;

    try {
        const priorityConfig = QA_PRIORITY_CONFIG[bug.priority];
        const dashboardUrl = `${DASHBOARD_BASE_URL}/dashboard/ceo?tab=qa&bugId=${bug.id}`;

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `🔧 Bug Fixed — Awaiting Verification`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Bug*\n${bug.title}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Priority*\n${priorityConfig.emoji} ${bug.priority}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Fixed By*\n${bug.assignedTo || 'Unknown'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Commit*\n${bug.commitFixed ? `\`${bug.commitFixed.slice(0, 8)}\`` : 'Not recorded'}`
                    }
                ]
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `⏳ Pinky needs to verify this fix before it can be closed.`
                }
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '✅ Verify Fix',
                            emoji: true
                        },
                        url: dashboardUrl,
                        action_id: 'verify_qa_fix'
                    }
                ]
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Bug ID: \`${bug.id}\``
                    }
                ]
            }
        ];

        await sendQASlackNotification(blocks, `🔧 Fixed: ${bug.title}`);
    } catch (error) {
        logger.error('[QANotifications] Failed to send bug fixed notification', {
            error: error instanceof Error ? error.message : String(error),
            bugId: bug.id
        });
    }
}

/**
 * Notify #qa-bugs when a bug is verified and closed
 */
export async function notifyBugVerified(bug: QABug): Promise<void> {
    if (!SLACK_WEBHOOK_URL) return;

    try {
        const priorityConfig = QA_PRIORITY_CONFIG[bug.priority];

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `✅ Bug Verified & Closed`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Bug*\n${bug.title}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Priority*\n${priorityConfig.emoji} ${bug.priority}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Verified By*\n${bug.verifiedBy || 'Pinky'}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Fix Commit*\n${bug.commitFixed ? `\`${bug.commitFixed.slice(0, 8)}\`` : 'N/A'}`
                    }
                ]
            },
            ...(bug.notes ? [{
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Verification Notes*\n${bug.notes}`
                }
            }] : []),
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Bug ID: \`${bug.id}\` • This bug is now closed 🎉`
                    }
                ]
            }
        ];

        await sendQASlackNotification(blocks, `✅ Closed: ${bug.title}`);
    } catch (error) {
        logger.error('[QANotifications] Failed to send bug verified notification', {
            error: error instanceof Error ? error.message : String(error),
            bugId: bug.id
        });
    }
}

/**
 * Send a daily QA digest (P2/P3 summary + coverage stats)
 * Called by /api/cron/qa-daily-digest (Phase 2)
 */
export async function sendDailyDigest(report: QAReport): Promise<void> {
    if (!SLACK_WEBHOOK_URL) return;

    try {
        const { total, open, byPriority, testCoverage } = report;

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `📊 Daily QA Digest`,
                    emoji: true
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Open Bugs*\n${open} / ${total} total`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Test Coverage*\n${testCoverage.coveragePct}% (${testCoverage.passing}/${testCoverage.total})`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*P0 🔴*\n${byPriority.P0} open`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*P1 🟠*\n${byPriority.P1} open`
                    }
                ]
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*P2 🟡*\n${byPriority.P2} open`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*P3 🟢*\n${byPriority.P3} open`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Failing Tests*\n${testCoverage.failing}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Untested*\n${testCoverage.untested}`
                    }
                ]
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '🐛 View QA Dashboard',
                            emoji: true
                        },
                        url: `${DASHBOARD_BASE_URL}/dashboard/ceo?tab=qa`,
                        action_id: 'view_qa_dashboard'
                    }
                ]
            }
        ];

        await sendQASlackNotification(blocks, '📊 Daily QA Digest');
    } catch (error) {
        logger.error('[QANotifications] Failed to send daily digest', {
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

// ============================================================================
// INTERNAL SENDER
// ============================================================================

async function sendQASlackNotification(blocks: unknown[], title: string): Promise<void> {
    if (!SLACK_WEBHOOK_URL) {
        throw new Error('SLACK_WEBHOOK_QA_BUGS not configured');
    }

    const payload = { text: title, blocks };

    // AbortController for 5s timeout (from insight-notifier pattern)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
        }

        logger.info('[QANotifications] Slack notification sent', { title });
    } finally {
        clearTimeout(timeoutId);
    }
}
