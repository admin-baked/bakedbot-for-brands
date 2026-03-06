'use server';

import { z } from 'zod';
import { requireUser } from '@/server/auth/auth';
import {
    getAtRiskCustomers,
    getCustomerComms,
    getCustomerHistory,
    getSegmentSummary,
    getUpcomingBirthdays,
    lookupCustomer,
} from '@/server/tools/crm-tools';
import { getCampaignsForAgent, suggestAudience } from '@/server/tools/campaign-tools';
import { logger } from '@/lib/logger';
import type {
    GenerateInboxCrmInsightInput,
    InboxCrmCampaignInsight,
    InboxCrmCustomerInsight,
    InboxCrmInsight,
    InboxCrmMetric,
    InboxCrmWorkflow,
} from '@/types/inbox-crm';

const GenerateInboxCrmInsightInputSchema = z.object({
    orgId: z.string().min(3).max(128).refine((value) => !/[\/\\?#\[\]]/.test(value), 'Invalid organization ID'),
    workflow: z.enum(['winback', 'birthday', 'vip', 'segment_analysis', 'restock', 'comms_review']),
    prompt: z.string().max(1000).optional(),
    customerId: z.string().max(320).optional(),
    customerEmail: z.string().max(320).optional(),
});

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return token.currentOrgId || token.orgId || token.brandId || token.tenantId || token.organizationId || null;
}

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }

    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

function formatCurrency(value: number | undefined): string {
    return `$${Math.round(value || 0).toLocaleString()}`;
}

function appendPromptContext(base: string, prompt?: string): string {
    const trimmed = prompt?.trim();
    return trimmed ? `${base}\n\nAdditional context: ${trimmed}` : base;
}

function buildSegmentMetrics(segments: Record<string, unknown>): {
    totalCustomers: number;
    vipCount: number;
    vipSpend: number;
    loyalCount: number;
    atRiskCount: number;
    atRiskSpend: number;
} {
    const segmentData = segments as Record<string, { count?: number; totalSpent?: number }>;
    const entries = Object.values(segmentData);
    const totalCustomers = entries.reduce((sum, segment) => sum + (segment?.count || 0), 0);
    const vipCount = segmentData.vip?.count || 0;
    const vipSpend = segmentData.vip?.totalSpent || 0;
    const loyalCount = (segmentData.loyal?.count || 0) + (segmentData.high_value?.count || 0);
    const atRiskCount = (segmentData.at_risk?.count || 0) + (segmentData.slipping?.count || 0);
    const atRiskSpend = (segmentData.at_risk?.totalSpent || 0) + (segmentData.slipping?.totalSpent || 0);

    return {
        totalCustomers,
        vipCount,
        vipSpend,
        loyalCount,
        atRiskCount,
        atRiskSpend,
    };
}

function mapCustomerList(customers: Record<string, unknown>[]): InboxCrmCustomerInsight[] {
    return customers.map((customer) => {
        const item = customer as Record<string, unknown>;
        return {
            id: String(item.id || ''),
            name: String(item.name || 'Unknown'),
            email: item.email ? String(item.email) : undefined,
            segment: item.segment ? String(item.segment) : undefined,
            totalSpent: typeof item.totalSpent === 'number' ? item.totalSpent : undefined,
            daysSinceLastOrder: typeof item.daysSinceLastOrder === 'number' ? item.daysSinceLastOrder : undefined,
            birthday: item.birthday ? String(item.birthday) : undefined,
            daysAway: typeof item.daysAway === 'number' ? item.daysAway : undefined,
        };
    });
}

function mapCampaignList(campaigns: Record<string, unknown>[]): InboxCrmCampaignInsight[] {
    return campaigns.map((campaign) => {
        const item = campaign as Record<string, unknown>;
        const performance = (item.performance || {}) as Record<string, unknown>;
        return {
            id: String(item.id || ''),
            name: String(item.name || 'Campaign'),
            goal: item.goal ? String(item.goal) : undefined,
            channels: Array.isArray(item.channels) ? item.channels.map(String) : undefined,
            status: item.status ? String(item.status) : undefined,
            sent: typeof performance.sent === 'number' ? performance.sent : undefined,
            openRate: typeof performance.openRate === 'number' ? performance.openRate : undefined,
            clickRate: typeof performance.clickRate === 'number' ? performance.clickRate : undefined,
            revenue: typeof performance.revenue === 'number' ? performance.revenue : undefined,
        };
    });
}

function buildWinbackInsight(customers: InboxCrmCustomerInsight[], prompt?: string): InboxCrmInsight {
    const totalLtv = customers.reduce((sum, customer) => sum + (customer.totalSpent || 0), 0);
    const topNames = customers.slice(0, 3).map((customer) => customer.name).join(', ');

    return {
        workflow: 'winback',
        title: 'Win-Back Opportunity',
        summary: customers.length
            ? `${customers.length} high-priority at-risk customers are ready for re-engagement. Top accounts: ${topNames}.`
            : 'No at-risk customers were found in the current CRM data.',
        metrics: [
            { label: 'Customers', value: String(customers.length) },
            { label: 'LTV At Risk', value: formatCurrency(totalLtv), tone: customers.length ? 'warning' : 'neutral' },
            {
                label: 'Most Inactive',
                value: customers.length
                    ? `${Math.max(...customers.map((customer) => customer.daysSinceLastOrder || 0))}d`
                    : '0d',
            },
        ],
        customers,
        actions: [
            {
                kind: 'campaign',
                label: 'Open Win-Back Campaign',
                prompt: appendPromptContext(
                    `Plan a win-back campaign for our highest-value at-risk customers. Prioritize ${topNames || 'our at-risk segment'} and build an email + SMS sequence with a clear loyalty incentive.`,
                    prompt,
                ),
            },
            {
                kind: 'outreach',
                label: 'Draft Personalized Outreach',
                prompt: appendPromptContext(
                    `Draft personalized outreach for the top at-risk customers${topNames ? ` (${topNames})` : ''}. Use a premium but compliant retention angle and mention a limited-time return incentive.`,
                    prompt,
                ),
            },
        ],
    };
}

function buildBirthdayInsight(customers: InboxCrmCustomerInsight[], prompt?: string): InboxCrmInsight {
    const vipBirthdays = customers.filter((customer) => customer.segment === 'vip').length;

    return {
        workflow: 'birthday',
        title: 'Upcoming Birthday Campaign',
        summary: customers.length
            ? `${customers.length} customers have birthdays coming up soon. ${vipBirthdays} are in the VIP segment.`
            : 'No upcoming birthdays were found in the configured window.',
        metrics: [
            { label: 'Birthdays', value: String(customers.length) },
            { label: 'VIP Birthdays', value: String(vipBirthdays), tone: vipBirthdays ? 'good' : 'neutral' },
            {
                label: 'Next Birthday',
                value: customers.length ? `${Math.min(...customers.map((customer) => customer.daysAway || 0))}d` : 'n/a',
            },
        ],
        customers,
        actions: [
            {
                kind: 'campaign',
                label: 'Open Birthday Campaign',
                prompt: appendPromptContext(
                    `Plan a birthday campaign for customers with birthdays in the next two weeks. Include a loyalty reward, segment-aware messaging, and both email + SMS variants.`,
                    prompt,
                ),
            },
            {
                kind: 'outreach',
                label: 'Draft Birthday Message',
                prompt: appendPromptContext(
                    `Draft a compliant birthday outreach message for upcoming customer birthdays. Keep it warm, personalized, and loyalty-focused.`,
                    prompt,
                ),
            },
        ],
    };
}

function buildVipInsight(metrics: ReturnType<typeof buildSegmentMetrics>, prompt?: string): InboxCrmInsight {
    return {
        workflow: 'vip',
        title: 'VIP Appreciation Opportunity',
        summary: metrics.vipCount
            ? `${metrics.vipCount} VIP customers account for ${formatCurrency(metrics.vipSpend)} in lifetime value. This is the right cohort for early access or premium loyalty perks.`
            : 'No VIP segment was found in the current CRM snapshot.',
        metrics: [
            { label: 'VIP Customers', value: String(metrics.vipCount), tone: metrics.vipCount ? 'good' : 'neutral' },
            { label: 'VIP LTV', value: formatCurrency(metrics.vipSpend) },
            { label: 'Loyal / High Value', value: String(metrics.loyalCount) },
        ],
        actions: [
            {
                kind: 'campaign',
                label: 'Open VIP Campaign',
                prompt: appendPromptContext(
                    `Plan a VIP appreciation campaign for our highest-value customers. Focus on exclusivity, early access, and premium loyalty rewards without over-discounting.`,
                    prompt,
                ),
            },
            {
                kind: 'outreach',
                label: 'Draft VIP Outreach',
                prompt: appendPromptContext(
                    `Draft a VIP appreciation message for our top customers. Make it feel exclusive, premium, and compliant.`,
                    prompt,
                ),
            },
        ],
    };
}

function buildSegmentInsight(metrics: ReturnType<typeof buildSegmentMetrics>, prompt?: string): InboxCrmInsight {
    return {
        workflow: 'segment_analysis',
        title: 'Customer Segment Analysis',
        summary: `The CRM currently tracks ${metrics.totalCustomers} customers. The largest opportunity is balancing VIP retention with ${metrics.atRiskCount} customers currently slipping or at risk.`,
        metrics: [
            { label: 'Total Customers', value: String(metrics.totalCustomers) },
            { label: 'VIP Customers', value: String(metrics.vipCount), tone: 'good' },
            { label: 'At-Risk Revenue', value: formatCurrency(metrics.atRiskSpend), tone: metrics.atRiskSpend ? 'warning' : 'neutral' },
        ],
        actions: [
            {
                kind: 'campaign',
                label: 'Open Segment Campaign',
                prompt: appendPromptContext(
                    `Plan a segmented lifecycle campaign using our current CRM mix. Prioritize VIP retention and a recovery path for slipping / at-risk customers.`,
                    prompt,
                ),
            },
            {
                kind: 'performance',
                label: 'Review CRM Performance',
                prompt: appendPromptContext(
                    `Analyze our customer segments. We have ${metrics.totalCustomers} total customers, ${metrics.vipCount} VIPs, and ${formatCurrency(metrics.atRiskSpend)} in at-risk revenue. What should we do next?`,
                    prompt,
                ),
            },
        ],
    };
}

function buildRestockInsight(segmentLabels: string[], prompt?: string): InboxCrmInsight {
    return {
        workflow: 'restock',
        title: 'Restock Alert Audience',
        summary: segmentLabels.length
            ? `Restock alerts are best targeted at ${segmentLabels.join(', ')} before using a broad send.`
            : 'No recommended restock segments were returned from the campaign audience model.',
        metrics: [
            { label: 'Suggested Segments', value: String(segmentLabels.length) },
            { label: 'Primary Goal', value: 'Restock Alert' },
        ],
        actions: [
            {
                kind: 'campaign',
                label: 'Open Restock Campaign',
                prompt: appendPromptContext(
                    `Plan a restock alert campaign for ${segmentLabels.join(', ') || 'our best-fit customer segments'}. Keep the message urgency-focused, compliant, and optimized for repeat buyers.`,
                    prompt,
                ),
            },
            {
                kind: 'outreach',
                label: 'Draft Restock Message',
                prompt: appendPromptContext(
                    `Draft a compliant restock alert for ${segmentLabels.join(', ') || 'repeat customers'} with a clear product-back-in-stock message and short CTA.`,
                    prompt,
                ),
            },
        ],
    };
}

function buildCommsReviewInsight(campaigns: InboxCrmCampaignInsight[], prompt?: string): InboxCrmInsight {
    const campaignsWithOpens = campaigns.filter((campaign) => typeof campaign.openRate === 'number');
    const averageOpenRate = campaignsWithOpens.length
        ? campaignsWithOpens.reduce((sum, campaign) => sum + (campaign.openRate || 0), 0) / campaignsWithOpens.length
        : 0;
    const topCampaign = [...campaigns].sort((a, b) => (b.openRate || 0) - (a.openRate || 0))[0];

    return {
        workflow: 'comms_review',
        title: 'Recent CRM Communications',
        summary: campaigns.length
            ? `Reviewed ${campaigns.length} recent sent campaigns. ${topCampaign ? `${topCampaign.name} has the strongest open rate so far.` : 'Use the latest performance to tune the next send.'}`
            : 'No recent sent campaigns were found to review.',
        metrics: [
            { label: 'Campaigns Reviewed', value: String(campaigns.length) },
            { label: 'Avg Open Rate', value: `${averageOpenRate.toFixed(1)}%`, tone: averageOpenRate >= 20 ? 'good' : 'warning' },
            { label: 'Top Performer', value: topCampaign?.name || 'n/a' },
        ],
        campaigns,
        actions: [
            {
                kind: 'performance',
                label: 'Open Performance Review',
                prompt: appendPromptContext(
                    `Review our recent CRM campaigns. Average open rate is ${averageOpenRate.toFixed(1)}%${topCampaign ? ` and ${topCampaign.name} is the current top performer.` : ''} Recommend optimizations for the next send.`,
                    prompt,
                ),
            },
            {
                kind: 'campaign',
                label: 'Plan Improved Campaign',
                prompt: appendPromptContext(
                    `Plan the next lifecycle campaign using lessons from recent sends. Improve open rate, click rate, and conversion without expanding to a broader audience than necessary.`,
                    prompt,
                ),
            },
        ],
    };
}

async function buildCustomerSpecificNotes(orgId: string, customerId?: string, customerEmail?: string): Promise<string[]> {
    if (!customerId && !customerEmail) {
        return [];
    }

    const notes: string[] = [];

    try {
        const lookup = await lookupCustomer(customerId || customerEmail || '', orgId);
        const customer = (lookup as { customer?: Record<string, unknown> }).customer;
        if (customer) {
            notes.push(`Customer context: ${String(customer.displayName || customer.email || 'Known customer')} (${String(customer.segment || 'unknown segment')}).`);
        }
    } catch {
        // Non-fatal context enrichment.
    }

    if (customerId) {
        try {
            const history = await getCustomerHistory(customerId, orgId, 3);
            if (history.orders?.length) {
                notes.push(`Recent order history is available for ${history.orders.length} orders.`);
            }
        } catch {
            // Non-fatal context enrichment.
        }
    }

    if (customerEmail) {
        try {
            const comms = await getCustomerComms(customerEmail, orgId, 3);
            if (comms.communications?.length) {
                notes.push(`Recent communications are available for ${customerEmail}.`);
            }
        } catch {
            // Non-fatal context enrichment.
        }
    }

    return notes;
}

export async function generateInboxCrmInsight(input: GenerateInboxCrmInsightInput): Promise<{
    success: boolean;
    insight?: InboxCrmInsight;
    error?: string;
}> {
    try {
        const parsed = GenerateInboxCrmInsightInputSchema.parse(input);
        const user = await requireUser();
        assertOrgAccess(user, parsed.orgId);

        let insight: InboxCrmInsight;
        switch (parsed.workflow as InboxCrmWorkflow) {
            case 'winback': {
                const result = await getAtRiskCustomers(parsed.orgId, 10, true);
                insight = buildWinbackInsight(mapCustomerList(result.customers), parsed.prompt);
                break;
            }
            case 'birthday': {
                const result = await getUpcomingBirthdays(parsed.orgId, 14);
                insight = buildBirthdayInsight(mapCustomerList(result.customers), parsed.prompt);
                break;
            }
            case 'vip': {
                const result = await getSegmentSummary(parsed.orgId);
                insight = buildVipInsight(buildSegmentMetrics(result.segments), parsed.prompt);
                break;
            }
            case 'segment_analysis': {
                const result = await getSegmentSummary(parsed.orgId);
                insight = buildSegmentInsight(buildSegmentMetrics(result.segments), parsed.prompt);
                break;
            }
            case 'restock': {
                const result = await suggestAudience({ orgId: parsed.orgId, goal: 'restock_alert' });
                const segments = (result.segments || [])
                    .map((segment) => segment as Record<string, unknown>)
                    .map((segment) => String(segment.label || segment.segment || ''))
                    .filter(Boolean);
                insight = buildRestockInsight(segments, parsed.prompt);
                break;
            }
            case 'comms_review': {
                const result = await getCampaignsForAgent({ orgId: parsed.orgId, status: 'sent', limit: 5 });
                insight = buildCommsReviewInsight(mapCampaignList(result.campaigns), parsed.prompt);
                break;
            }
            default:
                throw new Error('Unsupported CRM workflow');
        }

        const customerNotes = await buildCustomerSpecificNotes(parsed.orgId, parsed.customerId, parsed.customerEmail);
        if (customerNotes.length > 0) {
            insight = {
                ...insight,
                summary: `${insight.summary} ${customerNotes.join(' ')}`.trim(),
            };
        }

        return {
            success: true,
            insight,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to generate CRM insight';
        logger.error('[InboxCRM] generateInboxCrmInsight failed', { error: message });
        return { success: false, error: message };
    }
}
