/**
 * Campaign Compliance Service
 *
 * Runs Deebo compliance checks against campaign content per channel.
 * Updates campaign document with compliance results.
 */

import { deebo, type ComplianceResult } from '@/server/agents/deebo';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type { Campaign, CampaignChannel, CampaignContent } from '@/types/campaign';

// =============================================================================
// RUN COMPLIANCE CHECK
// =============================================================================

/**
 * Run compliance checks on all campaign content channels.
 * Updates the campaign doc with results per channel and aggregated status.
 */
export async function runComplianceCheck(campaign: Campaign): Promise<{
    overallStatus: 'passed' | 'failed' | 'warning';
    results: Record<string, ComplianceResult>;
}> {
    logger.info('[CAMPAIGN_COMPLIANCE] Starting compliance check', {
        campaignId: campaign.id,
        channels: campaign.channels,
    });

    const results: Record<string, ComplianceResult> = {};
    let hasFailure = false;
    let hasWarning = false;

    for (const channel of campaign.channels) {
        const content = campaign.content[channel];
        if (!content) continue;

        const textToCheck = buildComplianceText(channel, content);
        if (!textToCheck) continue;

        try {
            // Map campaign channel to Deebo channel format
            const deeboChannel = channel === 'email' ? 'email' : 'sms';
            const result = await deebo.checkContent('NY', deeboChannel, textToCheck);

            results[channel] = result;

            if (result.status === 'fail') hasFailure = true;
            if (result.status === 'warning') hasWarning = true;

            logger.info('[CAMPAIGN_COMPLIANCE] Channel checked', {
                campaignId: campaign.id,
                channel,
                status: result.status,
                violations: result.violations.length,
            });
        } catch (error) {
            logger.error('[CAMPAIGN_COMPLIANCE] Channel check failed', {
                campaignId: campaign.id,
                channel,
                error: (error as Error).message,
            });

            results[channel] = {
                status: 'fail',
                violations: ['Compliance check system error — manual review required.'],
                suggestions: ['Try re-submitting for compliance review.'],
            };
            hasFailure = true;
        }
    }

    const overallStatus = hasFailure ? 'failed' : hasWarning ? 'warning' : 'passed';

    // Update campaign document
    try {
        const { firestore } = await createServerClient();
        const now = new Date();

        // Build updated content with compliance results
        const updatedContent: Record<string, unknown> = {};
        for (const channel of campaign.channels) {
            const existing = campaign.content[channel];
            if (!existing) continue;

            const result = results[channel];
            updatedContent[channel] = {
                ...existing,
                complianceStatus: result
                    ? (result.status === 'pass' ? 'passed' : result.status === 'fail' ? 'failed' : 'warning')
                    : 'pending',
                complianceViolations: result?.violations || [],
                complianceSuggestions: result?.suggestions || [],
            };
        }

        // Move to pending_approval if passed, or keep in compliance_review if failed/warning
        const nextStatus = overallStatus === 'passed' ? 'pending_approval' : 'compliance_review';

        await firestore.collection('campaigns').doc(campaign.id).update({
            content: updatedContent,
            complianceStatus: overallStatus,
            complianceReviewedAt: now,
            status: nextStatus,
            updatedAt: now,
        });

        logger.info('[CAMPAIGN_COMPLIANCE] Compliance check complete', {
            campaignId: campaign.id,
            overallStatus,
            nextStatus,
        });
    } catch (error) {
        logger.error('[CAMPAIGN_COMPLIANCE] Failed to update campaign with results', {
            campaignId: campaign.id,
            error: (error as Error).message,
        });
    }

    return { overallStatus, results };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build the text string to send to Deebo for compliance checking.
 */
function buildComplianceText(channel: CampaignChannel, content: CampaignContent): string | null {
    const parts: string[] = [];

    if (content.subject) {
        parts.push(`Subject: ${content.subject}`);
    }

    if (content.body) {
        parts.push(content.body);
    }

    // For HTML email, strip tags and check that too
    if (content.htmlBody) {
        const plainFromHtml = content.htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (plainFromHtml !== content.body) {
            parts.push(plainFromHtml);
        }
    }

    return parts.length > 0 ? parts.join('\n\n') : null;
}
