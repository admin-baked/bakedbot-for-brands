/**
 * Email Thread Types
 *
 * Bidirectional email conversation model.
 * Covers customer replies (Thrive, Ecstatic) and dispensary outreach replies (super user).
 * Stored in Firestore collection: `email_threads`
 */

// ─────────────────────────────────────────────────────────────
// Core types
// ─────────────────────────────────────────────────────────────

export type EmailDirection = 'outbound' | 'inbound';

export type EmailThreadStatus = 'open' | 'replied' | 'closed';

/** Who owns / can see this thread */
export type EmailThreadScope =
    | 'org'         // Org-level: customer replied to an org email (Thrive, Ecstatic, etc.)
    | 'outreach'    // Super-user-level: dispensary replied to BakedBot outreach email
    | 'platform';   // Internal platform emails (system-to-system)

export interface EmailMessage {
    id: string;
    direction: EmailDirection;
    from: string;
    to: string;
    subject: string;
    /** Plain text preview (first 500 chars) */
    preview: string;
    /** Full HTML body — stored for outbound only; inbound stripped to text */
    htmlBody?: string;
    sesMessageId?: string;
    /** RFC 2822 In-Reply-To header value — used to match replies to threads */
    inReplyTo?: string;
    sentAt: Date;
}

export interface EmailThread {
    id: string;

    // Ownership + visibility
    scope: EmailThreadScope;
    /** orgId for org-scoped threads; undefined for outreach threads */
    orgId?: string;

    // Participants
    /** The non-BakedBot participant's email */
    counterpartEmail: string;
    /** BakedBot-side sending address (hello@thrive.bakedbot.ai, hello@outreach.bakedbot.ai, etc.) */
    bakedBotEmail: string;

    subject: string;
    status: EmailThreadStatus;

    // Attribution
    agentName?: string;
    campaignId?: string;
    /** For outreach threads: dispensary name */
    dispensaryName?: string;
    /** For org threads: customer name */
    customerName?: string;

    messages: EmailMessage[];
    unreadCount: number;

    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;
}

// ─────────────────────────────────────────────────────────────
// SES inbound payload (from SNS → webhook)
// ─────────────────────────────────────────────────────────────

export interface SesInboundMail {
    messageId: string;
    timestamp: string;
    source: string;
    destination: string[];
    commonHeaders: {
        from: string[];
        to: string[];
        subject: string;
        messageId: string;
        inReplyTo?: string;
        date: string;
    };
}

export interface SesInboundContent {
    /** Raw email content (base64 or plain) — we extract text from this */
    data?: string;
}

export interface SesInboundRecord {
    mail: SesInboundMail;
    content?: SesInboundContent;
    receipt: {
        recipients: string[];
        action?: {
            type: string;
            topicArn?: string;
            bucketName?: string;
            objectKey?: string;
        };
    };
}

export interface SesInboundSnsPayload {
    Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
    TopicArn: string;
    Message: string; // JSON string containing SesInboundRecord
}
