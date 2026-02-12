'use server';

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import type {
    CustomerCommunication,
    CommunicationChannel,
    CommunicationType,
    ScheduledCommunication,
} from '@/types/customer-communications';

// ==========================================
// Log a communication (fire-and-forget safe)
// ==========================================

/**
 * Log an outbound communication to a customer.
 * Designed to be called fire-and-forget from email/SMS services.
 */
export async function logCommunication(params: {
    customerEmail: string;
    orgId: string;
    channel: CommunicationChannel;
    type: CommunicationType;
    subject?: string;
    preview?: string;
    agentName?: string;
    campaignId?: string;
    provider?: string;
    providerMessageId?: string;
    metadata?: Record<string, unknown>;
}): Promise<string | null> {
    try {
        const { firestore } = await createServerClient();

        const doc = await firestore.collection('customer_communications').add({
            customerEmail: params.customerEmail.toLowerCase(),
            orgId: params.orgId,
            channel: params.channel,
            direction: 'outbound',
            type: params.type,
            subject: params.subject || null,
            preview: params.preview?.slice(0, 200) || null,
            status: 'sent',
            sentAt: new Date(),
            agentName: params.agentName || null,
            campaignId: params.campaignId || null,
            provider: params.provider || null,
            providerMessageId: params.providerMessageId || null,
            metadata: params.metadata || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        logger.info('[COMMS] Communication logged', {
            id: doc.id,
            channel: params.channel,
            type: params.type,
            email: params.customerEmail,
        });

        return doc.id;
    } catch (error) {
        logger.error('[COMMS] Failed to log communication', {
            error: (error as Error).message,
            email: params.customerEmail,
        });
        return null;
    }
}

// ==========================================
// Get customer communications
// ==========================================

/**
 * Fetch communication history for a customer by email.
 */
export async function getCustomerCommunications(
    customerEmail: string,
    orgId: string,
    options?: {
        limit?: number;
        channel?: CommunicationChannel;
        type?: CommunicationType;
    }
): Promise<CustomerCommunication[]> {
    try {
        const { firestore } = await createServerClient();

        let query: FirebaseFirestore.Query = firestore.collection('customer_communications')
            .where('customerEmail', '==', customerEmail.toLowerCase())
            .where('orgId', '==', orgId)
            .orderBy('createdAt', 'desc');

        if (options?.channel) {
            query = query.where('channel', '==', options.channel);
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const snap = await query.get();

        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                customerId: data.customerId || '',
                customerEmail: data.customerEmail,
                orgId: data.orgId,
                channel: data.channel,
                direction: data.direction || 'outbound',
                type: data.type,
                subject: data.subject,
                preview: data.preview,
                status: data.status,
                sentAt: data.sentAt?.toDate?.(),
                openedAt: data.openedAt?.toDate?.(),
                clickedAt: data.clickedAt?.toDate?.(),
                agentName: data.agentName,
                campaignId: data.campaignId,
                provider: data.provider,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                updatedAt: data.updatedAt?.toDate?.() || new Date(),
            } as CustomerCommunication;
        });
    } catch (error) {
        logger.error('[COMMS] Failed to fetch communications', {
            error: (error as Error).message,
            email: customerEmail,
        });
        return [];
    }
}

// ==========================================
// Get upcoming scheduled communications
// ==========================================

/**
 * Fetch upcoming scheduled emails for a customer.
 * Queries the scheduled_emails collection.
 */
export async function getUpcomingCommunications(
    customerEmail: string,
    orgId: string
): Promise<ScheduledCommunication[]> {
    try {
        const { firestore } = await createServerClient();

        const snap = await firestore.collection('scheduled_emails')
            .where('email', '==', customerEmail.toLowerCase())
            .where('status', '==', 'pending')
            .orderBy('scheduledFor', 'asc')
            .limit(10)
            .get();

        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                customerEmail: data.email,
                type: data.type || 'campaign',
                subject: data.subject,
                scheduledFor: data.scheduledFor?.toDate?.() || new Date(),
                status: data.status,
            };
        });
    } catch (error) {
        logger.error('[COMMS] Failed to fetch upcoming communications', {
            error: (error as Error).message,
            email: customerEmail,
        });
        return [];
    }
}

// ==========================================
// Update communication status (for tracking)
// ==========================================

/**
 * Update a communication's status (e.g., opened, clicked).
 */
export async function updateCommunicationStatus(
    communicationId: string,
    status: 'delivered' | 'opened' | 'clicked' | 'bounced',
): Promise<void> {
    try {
        const { firestore } = await createServerClient();
        const updateData: Record<string, unknown> = {
            status,
            updatedAt: new Date(),
        };

        if (status === 'opened') updateData.openedAt = new Date();
        if (status === 'clicked') updateData.clickedAt = new Date();
        if (status === 'bounced') updateData.bouncedAt = new Date();
        if (status === 'delivered') updateData.deliveredAt = new Date();

        await firestore.collection('customer_communications').doc(communicationId).update(updateData);
    } catch (error) {
        logger.error('[COMMS] Failed to update status', {
            error: (error as Error).message,
            communicationId,
        });
    }
}
