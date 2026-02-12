/**
 * Customer Communication Types
 * Tracks all emails, SMS, and push messages sent to/from customers
 */

export type CommunicationChannel = 'email' | 'sms' | 'push';
export type CommunicationDirection = 'outbound' | 'inbound';
export type CommunicationType =
    | 'campaign'
    | 'transactional'
    | 'welcome'
    | 'winback'
    | 'birthday'
    | 'order_update'
    | 'loyalty'
    | 'manual';

export type CommunicationStatus =
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'failed'
    | 'scheduled';

export interface CustomerCommunication {
    id: string;
    customerId: string;       // alleaves_XXX or CRM doc ID
    customerEmail: string;
    orgId: string;

    // Communication details
    channel: CommunicationChannel;
    direction: CommunicationDirection;
    type: CommunicationType;

    // Content
    subject?: string;         // Email subject line
    preview?: string;         // First ~200 chars of body
    templateId?: string;

    // Status & tracking
    status: CommunicationStatus;
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    bouncedAt?: Date;

    // Attribution
    agentName?: string;       // Craig, Mrs. Parker, etc.
    campaignId?: string;
    playbookId?: string;
    provider?: string;        // mailjet, blackleaf, sendgrid

    // Message IDs for provider tracking
    providerMessageId?: string;

    // Metadata
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ScheduledCommunication {
    id: string;
    customerEmail: string;
    type: string;
    subject?: string;
    scheduledFor: Date;
    status: 'pending' | 'sent' | 'failed';
}
