/**
 * Slack Block Kit Builder for Actionable Artifacts
 *
 * Converts an InboxArtifact with an ActionableRecommendation into
 * Slack Block Kit blocks with Approve / Decline / View Details buttons.
 *
 * Used by: daily briefing crons, insight notifier, agent Slack delivery.
 */

import type { InboxArtifact } from '@/types/inbox';

// ============================================================================
// Agent Emoji Map
// ============================================================================

const AGENT_EMOJI: Record<string, string> = {
    money_mike: ':moneybag:',
    smokey: ':herb:',
    ezal: ':detective:',
    craig: ':megaphone:',
    deebo: ':shield:',
    pops: ':clipboard:',
    mrs_parker: ':wave:',
    leo: ':gear:',
    day_day: ':sunrise:',
    linus: ':wrench:',
    jack: ':chart_with_upwards_trend:',
    marty: ':necktie:',
};

const SEVERITY_EMOJI: Record<string, string> = {
    high: ':red_circle:',
    medium: ':large_orange_circle:',
    low: ':large_blue_circle:',
};

const CONFIDENCE_LABEL: Record<string, string> = {
    high: ':white_check_mark: High confidence',
    medium: ':large_yellow_circle: Medium confidence',
    low: ':warning: Low confidence',
};

// ============================================================================
// Main Block Builder
// ============================================================================

/**
 * Build Slack Block Kit blocks for an actionable artifact.
 * Returns blocks array ready to pass to slackService.postMessage().
 */
export function buildActionableArtifactBlocks(
    artifact: InboxArtifact,
    options: {
        dashboardBaseUrl?: string;
        orgSlug?: string;
        showApprovalButtons?: boolean;
        autonomyLevel?: number;
    } = {}
): Record<string, unknown>[] {
    const actionable = artifact.actionable;
    if (!actionable) return [];

    const {
        dashboardBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bakedbot.ai',
        orgSlug,
        showApprovalButtons = true,
        autonomyLevel,
    } = options;

    const agentEmoji = AGENT_EMOJI[artifact.createdBy] ?? ':robot_face:';
    const agentName = artifact.createdBy.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const blocks: Record<string, unknown>[] = [];

    // Autonomy badge for Level 2+ cards
    const autonomyBadge = autonomyLevel && autonomyLevel >= 2
        ? ' :robot_face: _Auto-approve recommended_'
        : '';

    // Header with agent branding
    blocks.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `${agentEmoji} *${agentName}* — ${actionable.title}${autonomyBadge}`,
        },
    });

    // Rationale + impact
    const details: string[] = [];
    details.push(actionable.rationale);

    if (actionable.estimatedImpact) {
        details.push(`*Impact:* ${actionable.estimatedImpact}`);
    }

    const freshnessAge = getFreshnessLabel(actionable.dataFreshness);
    details.push(`${CONFIDENCE_LABEL[actionable.confidence]} · Data: ${freshnessAge}`);

    if (actionable.durationDays) {
        details.push(`*Duration:* ${actionable.durationDays}-day window`);
    }

    blocks.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: details.join('\n'),
        },
    });

    // Type-specific detail section
    const typeBlocks = buildTypeSpecificBlocks(artifact);
    if (typeBlocks.length) {
        blocks.push(...typeBlocks);
    }

    // Approve / Decline / View Details buttons
    if (showApprovalButtons && actionable.requiresApproval) {
        const actionValue = JSON.stringify({
            artifactId: artifact.id,
            orgId: artifact.orgId,
            type: artifact.type,
        });

        const elements: Record<string, unknown>[] = [
            {
                type: 'button',
                text: { type: 'plain_text', text: ':white_check_mark: Approve', emoji: true },
                style: 'primary',
                action_id: 'approve_artifact',
                value: actionValue,
            },
            {
                type: 'button',
                text: { type: 'plain_text', text: ':x: Decline', emoji: true },
                style: 'danger',
                action_id: 'decline_artifact',
                value: actionValue,
            },
        ];

        // Deep link to dashboard
        if (orgSlug) {
            elements.push({
                type: 'button',
                text: { type: 'plain_text', text: ':mag: View Details', emoji: true },
                url: `${dashboardBaseUrl}/${orgSlug}/dashboard/inbox?artifact=${artifact.id}`,
                action_id: 'view_artifact_details',
            });
        }

        blocks.push({
            type: 'actions',
            elements,
        });
    }

    // Context footer
    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `_${artifact.type.replace(/_/g, ' ')} · ${actionable.targetSystem} · ${actionable.reversible ? 'Reversible' : 'Irreversible'}_`,
            },
        ],
    });

    return blocks;
}

/**
 * Build the "result" blocks after an artifact is approved/declined.
 * Used to update the original Slack message via chat.update or response_url.
 */
export function buildArtifactDecisionBlocks(
    artifact: InboxArtifact,
    decision: 'approved' | 'declined',
    decidedBy: string,
    executionResult?: { success: boolean; externalId?: string; error?: string }
): Record<string, unknown>[] {
    const actionable = artifact.actionable;
    const agentEmoji = AGENT_EMOJI[artifact.createdBy] ?? ':robot_face:';
    const agentName = artifact.createdBy.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

    const blocks: Record<string, unknown>[] = [];

    // Original header (crossed out if declined)
    const titleText = decision === 'approved'
        ? `${agentEmoji} *${agentName}* — ${actionable?.title ?? artifact.type}`
        : `${agentEmoji} ~${agentName} — ${actionable?.title ?? artifact.type}~`;

    blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: titleText },
    });

    // Decision badge
    if (decision === 'approved') {
        const statusEmoji = executionResult?.success ? ':white_check_mark:' : ':warning:';
        const statusText = executionResult?.success
            ? `Applied successfully${executionResult.externalId ? ` (ID: ${executionResult.externalId})` : ''}`
            : `Approved but execution failed: ${executionResult?.error ?? 'unknown error'}`;
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${statusEmoji} *Approved* by <@${decidedBy}> at ${now}\n${statusText}`,
            },
        });
    } else {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:no_entry_sign: *Declined* by <@${decidedBy}> at ${now}`,
            },
        });
    }

    return blocks;
}

// ============================================================================
// Type-Specific Blocks
// ============================================================================

function buildTypeSpecificBlocks(artifact: InboxArtifact): Record<string, unknown>[] {
    const data = artifact.data as Record<string, unknown>;
    const blocks: Record<string, unknown>[] = [];

    switch (artifact.type) {
        case 'competitor_price_match': {
            const opps = (data.opportunities ?? []) as Array<Record<string, unknown>>;
            const top3 = opps.slice(0, 3);
            if (top3.length) {
                const lines = top3.map((opp) => {
                    const action = opp.action === 'beat' ? 'Beat by $1' : 'Match';
                    const impact = SEVERITY_EMOJI[opp.estimatedImpact as string] ?? '';
                    return `${impact} *${opp.productName}* — Us: $${opp.ourPrice} → Rec: *$${opp.recommendedPrice}* (${action} vs ${opp.competitorName})`;
                });
                blocks.push({
                    type: 'section',
                    text: { type: 'mrkdwn', text: lines.join('\n') },
                });
                if (opps.length > 3) {
                    blocks.push({
                        type: 'context',
                        elements: [{ type: 'mrkdwn', text: `_+ ${opps.length - 3} more opportunities_` }],
                    });
                }
            }
            break;
        }

        case 'flash_sale':
        case 'dead_stock_writeoff': {
            const products = (data.products ?? []) as Array<Record<string, unknown>>;
            const top = products.slice(0, 5);
            if (top.length) {
                const lines = top.map(p =>
                    `• *${p.name}* — ${p.stock ?? '?'} units · ${p.daysOld ?? '?'} days old`
                );
                blocks.push({
                    type: 'section',
                    text: { type: 'mrkdwn', text: lines.join('\n') },
                });
            }
            break;
        }

        case 'winback_campaign':
        case 'retention_wave': {
            const customers = (data.customers ?? []) as Array<Record<string, unknown>>;
            const top = customers.slice(0, 5);
            if (top.length) {
                const lines = top.map(c =>
                    `• *${c.name ?? 'Customer'}* — $${c.ltv ?? 0} LTV · ${c.daysSinceVisit ?? '?'}d inactive`
                );
                blocks.push({
                    type: 'section',
                    text: { type: 'mrkdwn', text: lines.join('\n') },
                });
            }
            break;
        }

        case 'restock_alert': {
            const product = data.productName ?? 'Product';
            const daysUntilStockout = data.daysUntilStockout ?? '?';
            const velocity = data.weeklyVelocity ?? '?';
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:rotating_light: *${product}* — estimated stockout in *${daysUntilStockout} days*\nSelling ~${velocity} units/week`,
                },
            });
            break;
        }

        case 'google_review_trend': {
            const rating = data.currentRating ?? '?';
            const delta = data.ratingDelta ?? 0;
            const recentCount = data.recentReviewCount ?? 0;
            const direction = (delta as number) >= 0 ? ':arrow_up:' : ':arrow_down:';
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `${direction} Rating: *${rating}* (${(delta as number) >= 0 ? '+' : ''}${delta} this week) · ${recentCount} new reviews`,
                },
            });
            break;
        }

        case 'birthday_offer': {
            const birthdays = (data.customers ?? []) as Array<Record<string, unknown>>;
            if (birthdays.length) {
                const lines = birthdays.slice(0, 5).map(c =>
                    `• *${c.name}* — ${c.birthdayDate ?? 'this week'} · $${c.ltv ?? 0} LTV`
                );
                blocks.push({
                    type: 'section',
                    text: { type: 'mrkdwn', text: `:birthday: *${birthdays.length} birthdays this week*\n${lines.join('\n')}` },
                });
            }
            break;
        }

        case 'local_event_boost': {
            const eventName = data.eventName ?? 'Local Event';
            const eventDate = data.eventDate ?? 'upcoming';
            const expectedImpact = data.expectedTrafficMultiplier ?? '1.5x';
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:stadium: *${eventName}* — ${eventDate}\nExpected traffic: *${expectedImpact}* normal · Prep inventory + staff accordingly`,
                },
            });
            break;
        }

        default:
            // Generic: just show the rationale (already in main section)
            break;
    }

    return blocks;
}

// ============================================================================
// Helpers
// ============================================================================

function getFreshnessLabel(isoTimestamp: string): string {
    const ageMs = Date.now() - new Date(isoTimestamp).getTime();
    const hours = Math.floor(ageMs / 3_600_000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ============================================================================
// Briefing Summary Builder (for daily briefing crons)
// ============================================================================

/**
 * Build a complete Slack briefing from multiple actionable artifacts.
 * Groups by agent, adds dividers, and includes all approval buttons.
 */
export function buildDailyBriefingBlocks(
    artifacts: InboxArtifact[],
    options: {
        orgName: string;
        orgSlug?: string;
        dashboardBaseUrl?: string;
    }
): Record<string, unknown>[] {
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    const blocks: Record<string, unknown>[] = [];

    // Header
    blocks.push({
        type: 'header',
        text: { type: 'plain_text', text: `:herb: ${options.orgName} Daily Briefing — ${today}`, emoji: true },
    });

    // Urgency summary
    const actionableCount = artifacts.filter(a => a.actionable?.requiresApproval).length;
    const infoCount = artifacts.length - actionableCount;
    blocks.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*${actionableCount}* items need your decision · *${infoCount}* informational updates`,
        },
    });
    blocks.push({ type: 'divider' });

    // Actionable items first (require decision)
    const actionable = artifacts.filter(a => a.actionable?.requiresApproval);
    const informational = artifacts.filter(a => !a.actionable?.requiresApproval);

    for (const artifact of actionable) {
        blocks.push(...buildActionableArtifactBlocks(artifact, {
            orgSlug: options.orgSlug,
            dashboardBaseUrl: options.dashboardBaseUrl,
            showApprovalButtons: true,
        }));
        blocks.push({ type: 'divider' });
    }

    // Informational items (no buttons needed)
    if (informational.length) {
        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: '*:information_source: For Your Awareness*' },
        });

        for (const artifact of informational) {
            blocks.push(...buildActionableArtifactBlocks(artifact, {
                orgSlug: options.orgSlug,
                dashboardBaseUrl: options.dashboardBaseUrl,
                showApprovalButtons: false,
            }));
        }
    }

    // Footer
    blocks.push({ type: 'divider' });
    blocks.push({
        type: 'context',
        elements: [{
            type: 'mrkdwn',
            text: `_Uncle Elroy · ${options.orgName} · ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}_`,
        }],
    });

    return blocks;
}

// ============================================================================
// Auto-Executed Card Notification (Level 3)
// ============================================================================

/**
 * Build Slack blocks for a Level 3 auto-executed card notification.
 * Includes an "Undo" button so the user can revert if needed.
 */
export function buildAutoExecutedBlocks(
    cardTitle: string,
    agentId: string,
    headline: string,
    artifactId: string,
    orgId: string
): Record<string, unknown>[] {
    const agentEmoji = AGENT_EMOJI[agentId] ?? ':robot_face:';
    const agentName = agentId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${agentEmoji} :robot_face: *Auto-executed: ${cardTitle}*\n${agentName}: ${headline}`,
            },
        },
        {
            type: 'actions',
            elements: [
                {
                    type: 'button',
                    text: { type: 'plain_text', text: ':rewind: Undo', emoji: true },
                    style: 'danger',
                    action_id: 'undo_auto_execute',
                    value: JSON.stringify({ artifactId, orgId, cardTitle }),
                },
            ],
        },
        {
            type: 'context',
            elements: [{
                type: 'mrkdwn',
                text: `_Auto-executed based on your approval pattern. This action will stop if you undo._`,
            }],
        },
    ];
}
