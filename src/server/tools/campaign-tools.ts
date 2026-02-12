/**
 * Campaign Tools for Agent Use
 *
 * Provides campaign CRUD, audience suggestion, content generation, and
 * compliance submission tools that agents can call during conversations.
 *
 * Pattern: Zod schemas (toolDefs) + exported async implementations.
 * Uses admin Firestore directly (runs inside agent harness context).
 */

import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { Campaign, CampaignGoal, CampaignChannel, CampaignContent } from '@/types/campaign';
import { CAMPAIGN_GOALS, CAMPAIGN_STATUS_INFO } from '@/types/campaign';
import type { CustomerSegment } from '@/types/customers';
import { getSegmentInfo, calculateSegment } from '@/types/customers';

// =============================================================================
// TOOL DEFINITIONS (Zod schemas for agent toolsDef arrays)
// =============================================================================

const createCampaignDraftDef = {
    name: 'createCampaignDraft',
    description: `Create a new campaign draft. Returns the campaign ID and inline marker for display. Use this after discussing campaign goals and audience with the user. The campaign starts in draft status.`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
        name: z.string().describe('Campaign name'),
        description: z.string().optional().describe('Brief description'),
        goal: z.enum([
            'drive_sales', 'winback', 'retention', 'loyalty', 'birthday',
            'restock_alert', 'vip_appreciation', 'product_launch', 'event_promo', 'awareness',
        ]).describe('Campaign goal'),
        channels: z.array(z.enum(['email', 'sms'])).describe('Delivery channels'),
        segments: z.array(z.string()).optional().describe('Target customer segments'),
        emailSubject: z.string().optional().describe('Email subject line'),
        emailBody: z.string().optional().describe('Email body text (supports {{firstName}}, {{segment}}, {{totalSpent}} variables)'),
        smsBody: z.string().optional().describe('SMS message text'),
        agentName: z.string().optional().describe('Agent creating this campaign'),
    }),
};

const getCampaignsDef = {
    name: 'getCampaigns',
    description: `List campaigns for an organization. Returns campaign names, statuses, channels, audience, and performance metrics. Use to see active, scheduled, or past campaigns.`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
        status: z.enum([
            'draft', 'compliance_review', 'pending_approval', 'approved',
            'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed',
        ]).optional().describe('Filter by status'),
        limit: z.number().optional().default(10).describe('Max campaigns to return'),
    }),
};

const getCampaignPerformanceDef = {
    name: 'getCampaignPerformance',
    description: `Get detailed performance metrics for a specific campaign. Returns sent, opened, clicked, bounced counts and rates plus attributed revenue. Use this to analyze campaign effectiveness.`,
    schema: z.object({
        campaignId: z.string().describe('Campaign ID'),
    }),
};

const suggestAudienceDef = {
    name: 'suggestAudience',
    description: `Suggest the best customer segments for a campaign goal. Analyzes the customer base and recommends segments with estimated reach. Use this when planning a new campaign.`,
    schema: z.object({
        orgId: z.string().describe('Organization/tenant ID'),
        goal: z.enum([
            'drive_sales', 'winback', 'retention', 'loyalty', 'birthday',
            'restock_alert', 'vip_appreciation', 'product_launch', 'event_promo', 'awareness',
        ]).describe('Campaign goal'),
    }),
};

const submitCampaignForReviewDef = {
    name: 'submitCampaignForReview',
    description: `Submit a campaign draft for Deebo compliance review. The campaign content will be checked against cannabis marketing rules. Use after content is finalized.`,
    schema: z.object({
        campaignId: z.string().describe('Campaign ID to submit'),
    }),
};

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

export async function createCampaignDraft(params: {
    orgId: string;
    name: string;
    description?: string;
    goal: CampaignGoal;
    channels: CampaignChannel[];
    segments?: string[];
    emailSubject?: string;
    emailBody?: string;
    smsBody?: string;
    agentName?: string;
}): Promise<{ campaignId: string; summary: string }> {
    const db = getAdminFirestore();

    const content: Partial<Record<CampaignChannel, CampaignContent>> = {};

    if (params.channels.includes('email') && params.emailBody) {
        content.email = {
            channel: 'email',
            subject: params.emailSubject || params.name,
            body: params.emailBody,
            htmlBody: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
<p>${params.emailBody.replace(/\n/g, '<br>')}</p>
</div>`,
        };
    }

    if (params.channels.includes('sms') && params.smsBody) {
        content.sms = {
            channel: 'sms',
            body: params.smsBody,
        };
    }

    const now = new Date();
    const campaignData = {
        orgId: params.orgId,
        createdBy: 'agent',
        createdByAgent: params.agentName || 'craig',
        name: params.name,
        description: params.description || null,
        goal: params.goal,
        status: 'draft',
        channels: params.channels,
        audience: {
            type: params.segments?.length ? 'segment' : 'all',
            segments: params.segments || [],
            estimatedCount: 0, // Will be resolved at send time
        },
        content,
        tags: [],
        createdAt: now,
        updatedAt: now,
    };

    const docRef = await db.collection('campaigns').add(campaignData);

    logger.info('[CAMPAIGN_TOOLS] Campaign draft created by agent', {
        id: docRef.id,
        name: params.name,
        agent: params.agentName,
    });

    const segmentLabels = params.segments?.map(s => getSegmentInfo(s as CustomerSegment).label).join(', ') || 'All customers';
    const channelStr = params.channels.join(' + ').toUpperCase();

    const summary = `:::campaign:draft:${params.name}
${JSON.stringify({
    id: docRef.id,
    name: params.name,
    goal: params.goal,
    channels: params.channels,
    segments: params.segments,
    status: 'draft',
})}
:::

**Campaign Draft Created: ${params.name}**
- Goal: ${CAMPAIGN_GOALS.find(g => g.id === params.goal)?.label || params.goal}
- Channels: ${channelStr}
- Audience: ${segmentLabels}
- Status: Draft — ready for compliance review

You can submit this for compliance review, edit the content, or schedule it from the [Campaigns dashboard](/dashboard/campaigns/${docRef.id}).`;

    return { campaignId: docRef.id, summary };
}

export async function getCampaignsForAgent(params: {
    orgId: string;
    status?: string;
    limit?: number;
}): Promise<{ summary: string; campaigns: Record<string, unknown>[] }> {
    const db = getAdminFirestore();

    let query: FirebaseFirestore.Query = db.collection('campaigns')
        .where('orgId', '==', params.orgId)
        .orderBy('createdAt', 'desc');

    if (params.status) {
        query = query.where('status', '==', params.status);
    }

    query = query.limit(params.limit || 10);
    const snap = await query.get();

    if (snap.empty) {
        return { summary: 'No campaigns found.', campaigns: [] };
    }

    const campaigns = snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            goal: data.goal,
            status: data.status,
            channels: data.channels,
            audience: data.audience,
            performance: data.performance,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
        };
    });

    const summary = `**Campaigns** (${campaigns.length} found)

| Name | Goal | Status | Channels | Sent | Opens |
|------|------|--------|----------|------|-------|
${campaigns.map(c => {
    const statusInfo = CAMPAIGN_STATUS_INFO[c.status as keyof typeof CAMPAIGN_STATUS_INFO];
    const perf = c.performance as { sent?: number; openRate?: number } | undefined;
    return `| ${c.name} | ${c.goal} | ${statusInfo?.label || c.status} | ${(c.channels as string[]).join('+')} | ${perf?.sent || '-'} | ${perf?.openRate ? `${perf.openRate.toFixed(1)}%` : '-'} |`;
}).join('\n')}`;

    return { summary, campaigns: campaigns as Record<string, unknown>[] };
}

export async function getCampaignPerformance(params: {
    campaignId: string;
}): Promise<{ summary: string; performance: Record<string, unknown> | null }> {
    const db = getAdminFirestore();
    const doc = await db.collection('campaigns').doc(params.campaignId).get();

    if (!doc.exists) {
        return { summary: 'Campaign not found.', performance: null };
    }

    const data = doc.data()!;
    const perf = data.performance;

    if (!perf || !perf.sent) {
        return {
            summary: `Campaign **${data.name}** (${data.status}) has not been sent yet. No performance data available.`,
            performance: null,
        };
    }

    const summary = `:::campaign:performance:${data.name}
${JSON.stringify({ id: doc.id, name: data.name, ...perf })}
:::

**Campaign Performance: ${data.name}**

| Metric | Value |
|--------|-------|
| Total Recipients | ${perf.totalRecipients} |
| Sent | ${perf.sent} |
| Delivered | ${perf.delivered} |
| Opened | ${perf.opened} (${perf.openRate?.toFixed(1)}%) |
| Clicked | ${perf.clicked} (${perf.clickRate?.toFixed(1)}%) |
| Bounced | ${perf.bounced} |
| Revenue | $${perf.revenue?.toLocaleString()} |`;

    return { summary, performance: perf as Record<string, unknown> };
}

export async function suggestAudience(params: {
    orgId: string;
    goal: CampaignGoal;
}): Promise<{ summary: string; segments: Record<string, unknown>[] }> {
    const db = getAdminFirestore();
    const goalInfo = CAMPAIGN_GOALS.find(g => g.id === params.goal);

    // Count customers by segment
    const snap = await db.collection('customers')
        .where('orgId', '==', params.orgId)
        .get();

    const segmentCounts: Record<string, number> = {};
    snap.docs.forEach(doc => {
        const data = doc.data();
        const segment = data.segment || 'new';
        segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
    });

    const suggested = goalInfo?.suggestedSegments || [];
    const segments = suggested.map(seg => ({
        segment: seg,
        label: getSegmentInfo(seg).label,
        count: segmentCounts[seg] || 0,
    }));

    const totalReach = segments.reduce((sum, s) => sum + s.count, 0);

    const summary = `**Audience Suggestion for "${goalInfo?.label || params.goal}"**

Recommended segments:
${segments.map(s => `- **${s.label}**: ${s.count} customers`).join('\n')}

**Estimated reach: ${totalReach} customers** across ${snap.size} total.

${goalInfo?.description || ''}`;

    return { summary, segments: segments as Record<string, unknown>[] };
}

export async function submitCampaignForReview(params: {
    campaignId: string;
}): Promise<{ summary: string; success: boolean }> {
    const db = getAdminFirestore();
    const doc = await db.collection('campaigns').doc(params.campaignId).get();

    if (!doc.exists) {
        return { summary: 'Campaign not found.', success: false };
    }

    const data = doc.data()!;
    if (data.status !== 'draft') {
        return {
            summary: `Campaign "${data.name}" is already in status: ${data.status}. Only draft campaigns can be submitted for review.`,
            success: false,
        };
    }

    await db.collection('campaigns').doc(params.campaignId).update({
        status: 'compliance_review',
        updatedAt: new Date(),
    });

    // Trigger compliance check asynchronously
    import('@/server/services/campaign-compliance').then(({ runComplianceCheck }) => {
        const campaign = { id: doc.id, ...data } as Campaign;
        runComplianceCheck(campaign).catch(err => {
            logger.error('[CAMPAIGN_TOOLS] Compliance check failed', { error: (err as Error).message });
        });
    }).catch(() => {});

    return {
        summary: `Campaign **"${data.name}"** has been submitted for compliance review. Deebo will check the content against cannabis marketing regulations. You'll be notified when the review is complete.`,
        success: true,
    };
}

// =============================================================================
// TOOL DEF EXPORTS (per agent)
// =============================================================================

/** Craig: full campaign management suite */
export const craigCampaignToolDefs = [
    createCampaignDraftDef,
    getCampaignsDef,
    getCampaignPerformanceDef,
    suggestAudienceDef,
    submitCampaignForReviewDef,
];

/** Mrs. Parker: campaign creation and listing */
export const mrsParkerCampaignToolDefs = [
    createCampaignDraftDef,
    getCampaignsDef,
];

/** Money Mike: campaign performance analysis */
export const moneyMikeCampaignToolDefs = [
    getCampaignsDef,
    getCampaignPerformanceDef,
];
