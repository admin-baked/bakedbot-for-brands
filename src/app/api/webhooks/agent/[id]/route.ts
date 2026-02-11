import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { sendAgentMessage } from '@/server/intuition/agent-bus';
import type { AgentName, MessageTopic } from '@/server/intuition/schema';
import crypto from 'crypto';

/**
 * Agent Webhook Receiver with Agent Bus Integration
 * URL: /api/webhooks/agent/[id]
 *
 * Receives POST requests, validates, transforms payload, and routes to Agent Bus.
 * Supports: GitHub, Slack, Stripe, Zapier, POS systems, and custom webhooks.
 */

// =============================================================================
// PAYLOAD TRANSFORMERS
// =============================================================================

type WebhookSource = 'github' | 'slack' | 'stripe' | 'zapier' | 'alleaves' | 'dutchie' | 'custom';

interface TransformedPayload {
    topic: MessageTopic;
    targetAgent: AgentName;
    summary: string;
    data: Record<string, unknown>;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}

function detectSource(headers: Record<string, string>): WebhookSource {
    if (headers['x-github-event']) return 'github';
    if (headers['x-slack-signature']) return 'slack';
    if (headers['stripe-signature']) return 'stripe';
    if (headers['x-hook-secret'] || headers['x-zapier-request-id']) return 'zapier';
    if (headers['x-alleaves-signature']) return 'alleaves';
    if (headers['x-dutchie-signature']) return 'dutchie';
    return 'custom';
}

function transformGitHubPayload(eventType: string, payload: Record<string, unknown>): TransformedPayload {
    const action = payload.action as string || 'unknown';
    const repo = (payload.repository as Record<string, unknown>)?.name || 'unknown';

    // Map GitHub events to agent topics
    const topicMap: Record<string, { topic: MessageTopic; agent: AgentName }> = {
        'push': { topic: 'anomaly', agent: 'linus' },
        'pull_request': { topic: 'anomaly', agent: 'linus' },
        'issues': { topic: 'anomaly', agent: 'linus' },
        'deployment': { topic: 'anomaly', agent: 'linus' },
        'deployment_status': { topic: 'anomaly', agent: 'linus' },
    };

    const mapping = topicMap[eventType] || { topic: 'anomaly' as MessageTopic, agent: 'linus' as AgentName };

    return {
        topic: mapping.topic,
        targetAgent: mapping.agent,
        summary: `GitHub ${eventType}: ${action} on ${repo}`,
        data: payload,
        priority: eventType === 'deployment_status' ? 'high' : 'medium',
    };
}

function transformSlackPayload(payload: Record<string, unknown>): TransformedPayload {
    const type = payload.type as string || 'message';
    const channel = (payload.channel as Record<string, unknown>)?.name || payload.channel || 'unknown';

    return {
        topic: 'anomaly',
        targetAgent: 'pops', // Pops handles communications
        summary: `Slack ${type} in ${channel}`,
        data: payload,
        priority: 'medium',
    };
}

function transformStripePayload(payload: Record<string, unknown>): TransformedPayload {
    const type = payload.type as string || 'unknown';
    const data = payload.data as Record<string, unknown> || {};
    const obj = data.object as Record<string, unknown> || {};

    // Map Stripe events to agents
    const isPayment = type.startsWith('payment_intent') || type.startsWith('charge');
    const isSubscription = type.startsWith('customer.subscription');
    const isInvoice = type.startsWith('invoice');

    let targetAgent: AgentName = 'money_mike';
    let topic: MessageTopic = 'price_change';
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

    if (type.includes('failed')) {
        priority = 'high';
        topic = 'anomaly';
    }

    if (isSubscription && type.includes('deleted')) {
        priority = 'urgent';
        topic = 'customer_trend';
        targetAgent = 'pops';
    }

    return {
        topic,
        targetAgent,
        summary: `Stripe ${type}: ${obj.id || 'unknown'}`,
        data: payload,
        priority,
    };
}

function transformPOSPayload(source: 'alleaves' | 'dutchie', payload: Record<string, unknown>): TransformedPayload {
    const eventType = payload.event_type as string || payload.type as string || 'unknown';

    // Inventory events go to Smokey
    if (eventType.includes('inventory') || eventType.includes('product')) {
        return {
            topic: 'inventory_alert',
            targetAgent: 'smokey',
            summary: `${source} ${eventType}`,
            data: payload,
            priority: eventType.includes('low_stock') ? 'high' : 'medium',
        };
    }

    // Order events go to Pops
    if (eventType.includes('order')) {
        return {
            topic: 'anomaly',
            targetAgent: 'pops',
            summary: `${source} ${eventType}`,
            data: payload,
            priority: 'medium',
        };
    }

    // Default to Smokey for POS
    return {
        topic: 'anomaly',
        targetAgent: 'smokey',
        summary: `${source} ${eventType}`,
        data: payload,
        priority: 'low',
    };
}

function transformZapierPayload(payload: Record<string, unknown>): TransformedPayload {
    // Zapier sends structured data based on Zap configuration
    const targetAgent = payload.target_agent as AgentName || 'pops';
    const topic = payload.topic as MessageTopic || 'anomaly';

    return {
        topic,
        targetAgent,
        summary: payload.summary as string || 'Zapier automation trigger',
        data: payload,
        priority: payload.priority as 'low' | 'medium' | 'high' | 'urgent' || 'medium',
    };
}

function transformPayload(
    source: WebhookSource,
    headers: Record<string, string>,
    payload: Record<string, unknown>
): TransformedPayload {
    switch (source) {
        case 'github':
            return transformGitHubPayload(headers['x-github-event'] || 'unknown', payload);
        case 'slack':
            return transformSlackPayload(payload);
        case 'stripe':
            return transformStripePayload(payload);
        case 'zapier':
            return transformZapierPayload(payload);
        case 'alleaves':
        case 'dutchie':
            return transformPOSPayload(source, payload);
        default:
            // Custom webhooks - try to use provided fields or defaults
            return {
                topic: payload.topic as MessageTopic || 'anomaly',
                targetAgent: payload.target_agent as AgentName || 'pops',
                summary: payload.summary as string || 'Custom webhook event',
                data: payload,
                priority: payload.priority as 'low' | 'medium' | 'high' | 'urgent' || 'medium',
            };
    }
}

// =============================================================================
// SECRET VERIFICATION
// =============================================================================

function verifySignature(
    source: WebhookSource,
    secret: string | undefined,
    headers: Record<string, string>,
    rawBody: string
): boolean {
    if (!secret) return true; // No secret configured, skip verification

    switch (source) {
        case 'github': {
            const signature = headers['x-hub-signature-256'];
            if (!signature) return false;
            const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        }
        case 'stripe': {
            const signature = headers['stripe-signature'];
            if (!signature) return false;
            // Stripe uses a more complex signature format with timestamp
            // For now, basic validation - full implementation would use stripe library
            return signature.includes('v1=');
        }
        case 'slack': {
            const timestamp = headers['x-slack-request-timestamp'];
            const signature = headers['x-slack-signature'];
            if (!timestamp || !signature) return false;
            const sigBasestring = `v0:${timestamp}:${rawBody}`;
            const expected = 'v0=' + crypto.createHmac('sha256', secret).update(sigBasestring).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        }
        default:
            // Custom webhooks - check x-webhook-signature header
            const customSig = headers['x-webhook-signature'] || headers['x-signature'];
            if (!customSig) return true; // No signature provided
            const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(customSig), Buffer.from(expected));
    }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: 'Missing webhook ID' }, { status: 400 });
    }

    try {
        // Get raw body for signature verification
        const rawBody = await req.text();
        const body = JSON.parse(rawBody || '{}');

        const headers: Record<string, string> = {};
        req.headers.forEach((val, key) => { headers[key] = val.toLowerCase() });

        // Validate webhook ID exists
        const db = getAdminFirestore();
        const webhookDoc = await db.collection('webhooks').doc(id).get();

        if (!webhookDoc.exists) {
            return NextResponse.json({ error: 'Invalid webhook ID' }, { status: 404 });
        }

        const webhookData = webhookDoc.data();
        if (webhookData?.enabled === false) {
            return NextResponse.json({ error: 'Webhook disabled' }, { status: 403 });
        }

        // Detect source and verify signature
        const source = webhookData?.source as WebhookSource || detectSource(headers);
        const secret = webhookData?.secret;

        if (secret && !verifySignature(source, secret, headers, rawBody)) {
            logger.warn('[Webhook] Signature verification failed', { webhookId: id, source });
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Check source allowlist if configured
        const allowedSources = webhookData?.allowedSources as string[] | undefined;
        if (allowedSources && !allowedSources.includes(source)) {
            logger.warn('[Webhook] Source not allowed', { webhookId: id, source, allowedSources });
            return NextResponse.json({ error: 'Source not allowed' }, { status: 403 });
        }

        // Transform payload for Agent Bus
        const transformed = transformPayload(source, headers, body);
        const tenantId = webhookData?.tenantId || 'system';

        // Send to Agent Bus
        await sendAgentMessage(tenantId, {
            fromAgent: 'linus', // Webhooks are received by Linus (CTO/system)
            toAgent: transformed.targetAgent,
            topic: transformed.topic,
            payload: {
                webhookId: id,
                source,
                summary: transformed.summary,
                ...transformed.data,
                receivedAt: new Date().toISOString(),
            },
            expiresInHours: transformed.priority === 'urgent' ? 6 : 24,
        });

        // Log event for audit trail
        await db.collection('agent_events').add({
            webhookId: id,
            tenantId,
            source,
            agentId: transformed.targetAgent,
            eventType: 'webhook_received',
            topic: transformed.topic,
            summary: transformed.summary,
            priority: transformed.priority,
            payload: body,
            headers: headers,
            timestamp: FieldValue.serverTimestamp(),
            processed: true, // Now routed via Agent Bus
            routedTo: transformed.targetAgent,
        });

        logger.info('[Webhook] Event routed to Agent Bus', {
            webhookId: id,
            source,
            targetAgent: transformed.targetAgent,
            topic: transformed.topic,
        });

        return NextResponse.json({
            success: true,
            message: 'Event received and routed',
            routedTo: transformed.targetAgent,
        });

    } catch (error) {
        logger.error('[Webhook] Error processing webhook', { webhookId: id, error });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'active', message: 'Send POST requests to this endpoint' });
}
