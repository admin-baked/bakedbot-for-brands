import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Generic Agent Webhook Receiver
 * URL: /api/webhooks/agent/[id]
 * 
 * Receives POST requests, validates the webhook ID, and logs the event
 * for the agent system to process.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Params is a Promise in Next.js 15+ or recent 14
) {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ error: 'Missing webhook ID' }, { status: 400 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const headers: Record<string, string> = {};
        req.headers.forEach((val, key) => { headers[key] = val });

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

        // Log event
        await db.collection('agent_events').add({
            webhookId: id,
            agentId: webhookData?.agentId || 'general',
            eventType: 'webhook_received',
            payload: body,
            headers: headers,
            timestamp: FieldValue.serverTimestamp(),
            processed: false
        });

        console.log(`[Webhook] Received event for ${id}`);

        return NextResponse.json({ success: true, message: 'Event received' });

    } catch (error: any) {
        console.error('[Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'active', message: 'Send POST requests to this endpoint' });
}
