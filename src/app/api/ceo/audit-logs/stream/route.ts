/**
 * Real-time Audit Log Streaming Endpoint
 *
 * GET /api/ceo/audit-logs/stream?filter=action:user_approved&limit=100
 *
 * Returns Server-Sent Events (SSE) stream of audit logs.
 * Requires: super_user role or JWT token
 *
 * Usage:
 *   const eventSource = new EventSource('/api/ceo/audit-logs/stream?limit=50&filter=action:campaign_scheduled');
 *   eventSource.onmessage = (event) => {
 *       const log = JSON.parse(event.data);
 *       console.log('Audit log:', log);
 *   };
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLogStreaming } from '@/server/services/audit-log-streaming';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        // Verify super user access
        const user = await requireSuperUser();
        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        logger.info(`[Audit Log Stream] User ${user.email} started stream`);

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const filterStr = searchParams.get('filter') || '';

        // Parse filter string (format: "action:user_approved,status:success")
        const filter: any = {};
        if (filterStr) {
            filterStr.split(',').forEach(part => {
                const [key, value] = part.split(':');
                if (key === 'action') {
                    filter.action = value.split('|');  // Support multiple actions with |
                } else if (key === 'actor') {
                    filter.actor = value;
                } else if (key === 'status') {
                    filter.status = value;
                }
            });
        }

        // Create SSE stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // Send initial connection message
                const msg = `:Connection started at ${new Date().toISOString()}\n\n`;
                controller.enqueue(encoder.encode(msg));

                // Set up audit log streaming
                const unsubscribe = auditLogStreaming.streamAuditLogs(
                    {
                        onData(log) {
                            try {
                                const data = `data: ${JSON.stringify(log)}\n\n`;
                                controller.enqueue(encoder.encode(data));
                            } catch (error: any) {
                                logger.error('[Audit Log Stream] Failed to send log:', { error: error instanceof Error ? error.message : String(error) });
                            }
                        },
                        onError(error) {
                            logger.error('[Audit Log Stream] Stream error:', error);
                            const errMsg = `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`;
                            controller.enqueue(encoder.encode(errMsg));
                        },
                    },
                    { limit, filter, returnHistorical: true }
                );

                // Handle client disconnect
                const originalClose = controller.close;
                controller.close = function() {
                    unsubscribe();
                    logger.info(`[Audit Log Stream] User ${user.email} disconnected`);
                    originalClose.call(this);
                };
            },
        });

        // Return SSE response
        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable buffering in proxies
            },
        });
    } catch (error: any) {
        logger.error('[Audit Log Stream] Failed to start stream:', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json(
            { error: 'Failed to start stream' },
            { status: 500 }
        );
    }
}
