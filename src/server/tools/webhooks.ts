'use server';

/**
 * Webhook Management Tool
 * 
 * Allows agents to create and manage their own webhook endpoints.
 * URL format: /api/webhooks/agent/[id]
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export type WebhookAction = 'create' | 'list' | 'delete';

export interface WebhookParams {
    action: WebhookAction;
    agentId?: string; // Default: general
    description?: string;
    webhookId?: string; // For delete
}

export interface WebhookResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface WebhookDoc {
    id: string;
    url: string;
    agentId: string;
    description: string;
    enabled: boolean;
    createdAt: any;
}

export async function manageWebhooks(params: WebhookParams): Promise<WebhookResult> {
    const db = getAdminFirestore();
    const collection = db.collection('webhooks');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    try {
        switch (params.action) {
            case 'create':
                const docRef = await collection.add({
                    agentId: params.agentId || 'general',
                    description: params.description || 'Agent Webhook',
                    enabled: true,
                    createdAt: FieldValue.serverTimestamp(),
                });

                const url = `${baseUrl}/api/webhooks/agent/${docRef.id}`;

                // Update doc with generated URL for easier listing
                await docRef.update({ url });

                return {
                    success: true,
                    data: {
                        id: docRef.id,
                        url,
                        message: `Webhook created: ${url}`
                    }
                };

            case 'list':
                const snapshot = await collection.orderBy('createdAt', 'desc').get();
                const hooks = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        url: data.url || `${baseUrl}/api/webhooks/agent/${doc.id}`,
                        description: data.description,
                        agentId: data.agentId,
                        enabled: data.enabled
                    };
                });

                return { success: true, data: hooks };

            case 'delete':
                if (!params.webhookId) {
                    return { success: false, error: 'Missing webhookId' };
                }
                await collection.doc(params.webhookId).delete();
                return { success: true, data: { message: `Deleted webhook ${params.webhookId}` } };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[manageWebhooks] Error:', error);
        return { success: false, error: error.message };
    }
}
