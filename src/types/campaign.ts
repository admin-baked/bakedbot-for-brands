/**
 * Campaign Management Types
 *
 * Full lifecycle: draft → compliance → approval → scheduled → sending → sent
 * Integrates with CRM segments, inbox threads, and agent tools.
 */

import type { CustomerSegment } from './customers';
import type { InboxAgentPersona } from './inbox';

// =============================================================================
// ENUMS / UNIONS
// =============================================================================

export type CampaignStatus =
    | 'draft'
    | 'compliance_review'
    | 'pending_approval'
    | 'approved'
    | 'scheduled'
    | 'sending'
    | 'sent'
    | 'paused'
    | 'cancelled'
    | 'failed';

export type CampaignGoal =
    | 'drive_sales'
    | 'winback'
    | 'retention'
    | 'loyalty'
    | 'birthday'
    | 'restock_alert'
    | 'vip_appreciation'
    | 'product_launch'
    | 'event_promo'
    | 'awareness';

export type CampaignChannel = 'email' | 'sms';

// =============================================================================
// AUDIENCE
// =============================================================================

export interface CampaignAudience {
    type: 'segment' | 'custom' | 'all';
    /** Selected segments (when type === 'segment') */
    segments?: CustomerSegment[];
    /** Custom filter criteria (when type === 'custom') */
    customFilter?: Record<string, unknown>;
    /** Estimated count at time of audience selection */
    estimatedCount: number;
    /** Actual resolved count at send time */
    resolvedCount?: number;
}

// =============================================================================
// CONTENT (per channel)
// =============================================================================

export interface CampaignContent {
    channel: CampaignChannel;
    /** Email subject line */
    subject?: string;
    /** Plain text body (SMS) or text fallback (email) */
    body: string;
    /** HTML body for email */
    htmlBody?: string;
    /** MMS image URL */
    imageUrl?: string;
    /** Deebo compliance status */
    complianceStatus?: 'pending' | 'passed' | 'failed' | 'warning';
    complianceViolations?: string[];
    complianceSuggestions?: string[];
}

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

export interface CampaignPerformance {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    /** Attributed revenue from campaign */
    revenue: number;
    /** Computed rates */
    openRate: number;
    clickRate: number;
    bounceRate: number;
    conversionRate: number;
    lastUpdated: Date;
}

// =============================================================================
// CAMPAIGN RECIPIENT (subcollection)
// =============================================================================

export interface CampaignRecipient {
    id: string;
    campaignId: string;
    customerId: string;
    email: string;
    phone?: string;
    firstName?: string;
    segment: CustomerSegment;
    channel: CampaignChannel;
    status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    bouncedAt?: Date;
    error?: string;
    /** Provider message ID for tracking */
    providerMessageId?: string;
}

// =============================================================================
// MAIN CAMPAIGN DOCUMENT
// =============================================================================

export interface Campaign {
    id: string;
    orgId: string;
    createdBy: string;
    /** Agent that created/managed this campaign */
    createdByAgent?: InboxAgentPersona;
    /** Linked inbox thread for conversational management */
    threadId?: string;

    // Core
    name: string;
    description?: string;
    goal: CampaignGoal;
    status: CampaignStatus;
    channels: CampaignChannel[];

    // Audience
    audience: CampaignAudience;

    // Content per channel
    content: Partial<Record<CampaignChannel, CampaignContent>>;

    // Scheduling
    scheduledAt?: Date;
    sentAt?: Date;
    completedAt?: Date;

    // Compliance (aggregate across channels)
    complianceStatus?: 'passed' | 'failed' | 'warning';
    complianceReviewedAt?: Date;

    // Approval
    approvedAt?: Date;
    approvedBy?: string;

    // Performance
    performance?: CampaignPerformance;

    // Metadata
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}

// =============================================================================
// CAMPAIGN GOAL METADATA
// =============================================================================

export interface CampaignGoalInfo {
    id: CampaignGoal;
    label: string;
    description: string;
    icon: string;
    suggestedSegments: CustomerSegment[];
    suggestedChannels: CampaignChannel[];
}

export const CAMPAIGN_GOALS: CampaignGoalInfo[] = [
    {
        id: 'drive_sales',
        label: 'Drive Sales',
        description: 'Boost revenue with targeted promotions and deals',
        icon: 'DollarSign',
        suggestedSegments: ['loyal', 'frequent', 'vip'],
        suggestedChannels: ['email', 'sms'],
    },
    {
        id: 'winback',
        label: 'Win Back',
        description: 'Re-engage customers who haven\'t visited recently',
        icon: 'UserPlus',
        suggestedSegments: ['at_risk', 'slipping', 'churned'],
        suggestedChannels: ['email', 'sms'],
    },
    {
        id: 'retention',
        label: 'Retention',
        description: 'Keep active customers engaged and buying',
        icon: 'Heart',
        suggestedSegments: ['loyal', 'frequent'],
        suggestedChannels: ['email'],
    },
    {
        id: 'loyalty',
        label: 'Loyalty Rewards',
        description: 'Reward loyal customers with exclusive offers',
        icon: 'Star',
        suggestedSegments: ['vip', 'loyal', 'high_value'],
        suggestedChannels: ['email', 'sms'],
    },
    {
        id: 'birthday',
        label: 'Birthday',
        description: 'Send birthday wishes with a special discount',
        icon: 'Cake',
        suggestedSegments: ['vip', 'loyal', 'frequent'],
        suggestedChannels: ['email', 'sms'],
    },
    {
        id: 'restock_alert',
        label: 'Restock Alert',
        description: 'Notify customers when their favorites are back in stock',
        icon: 'Package',
        suggestedSegments: ['loyal', 'frequent', 'vip'],
        suggestedChannels: ['sms'],
    },
    {
        id: 'vip_appreciation',
        label: 'VIP Appreciation',
        description: 'Exclusive offers and early access for top customers',
        icon: 'Crown',
        suggestedSegments: ['vip', 'high_value'],
        suggestedChannels: ['email'],
    },
    {
        id: 'product_launch',
        label: 'Product Launch',
        description: 'Announce new products and generate excitement',
        icon: 'Rocket',
        suggestedSegments: ['vip', 'loyal', 'frequent', 'new'],
        suggestedChannels: ['email', 'sms'],
    },
    {
        id: 'event_promo',
        label: 'Event Promotion',
        description: 'Promote in-store events, pop-ups, or specials',
        icon: 'Calendar',
        suggestedSegments: ['loyal', 'frequent', 'new'],
        suggestedChannels: ['email', 'sms'],
    },
    {
        id: 'awareness',
        label: 'Brand Awareness',
        description: 'Educate customers about products and brand values',
        icon: 'Lightbulb',
        suggestedSegments: ['new', 'loyal'],
        suggestedChannels: ['email'],
    },
];

// =============================================================================
// STATUS DISPLAY HELPERS
// =============================================================================

export interface CampaignStatusInfo {
    label: string;
    color: string;
    description: string;
}

export const CAMPAIGN_STATUS_INFO: Record<CampaignStatus, CampaignStatusInfo> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800', description: 'Campaign is being created' },
    compliance_review: { label: 'Compliance Review', color: 'bg-yellow-100 text-yellow-800', description: 'Deebo is reviewing content' },
    pending_approval: { label: 'Pending Approval', color: 'bg-orange-100 text-orange-800', description: 'Waiting for approval' },
    approved: { label: 'Approved', color: 'bg-blue-100 text-blue-800', description: 'Approved, ready to schedule' },
    scheduled: { label: 'Scheduled', color: 'bg-indigo-100 text-indigo-800', description: 'Scheduled for future send' },
    sending: { label: 'Sending', color: 'bg-purple-100 text-purple-800', description: 'Currently sending to recipients' },
    sent: { label: 'Sent', color: 'bg-green-100 text-green-800', description: 'Campaign sent successfully' },
    paused: { label: 'Paused', color: 'bg-amber-100 text-amber-800', description: 'Campaign paused' },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', description: 'Campaign was cancelled' },
    failed: { label: 'Failed', color: 'bg-red-200 text-red-900', description: 'Campaign failed to send' },
};

// =============================================================================
// HELPER: Default performance object
// =============================================================================

export function createDefaultPerformance(): CampaignPerformance {
    return {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        unsubscribed: 0,
        revenue: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        conversionRate: 0,
        lastUpdated: new Date(),
    };
}

// =============================================================================
// CAMPAIGN TEMPLATE VARIABLES
// =============================================================================

/** Variables available for personalization in campaign content */
export const CAMPAIGN_VARIABLES = [
    { key: '{{firstName}}', label: 'First Name', example: 'John' },
    { key: '{{lastName}}', label: 'Last Name', example: 'Smith' },
    { key: '{{segment}}', label: 'Customer Segment', example: 'VIP' },
    { key: '{{totalSpent}}', label: 'Total Spent', example: '$1,250' },
    { key: '{{orderCount}}', label: 'Order Count', example: '12' },
    { key: '{{daysSinceLastVisit}}', label: 'Days Since Last Visit', example: '15' },
    { key: '{{loyaltyPoints}}', label: 'Loyalty Points', example: '450' },
    { key: '{{orgName}}', label: 'Business Name', example: 'Thrive Syracuse' },
] as const;
