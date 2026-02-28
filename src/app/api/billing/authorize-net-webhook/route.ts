/**
 * Legacy Authorize.Net webhook compatibility endpoint.
 *
 * This route delegates to the hardened canonical handler at
 * `/api/webhooks/authnet` so every webhook path shares one
 * validation, reconciliation, and forensic pipeline.
 *
 * Keep this endpoint registered in Authorize.Net if needed:
 *   https://bakedbot.ai/api/billing/authorize-net-webhook
 * It now behaves as a compatibility alias, not a separate implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  POST as authnetWebhookPost,
  GET as authnetWebhookGet,
} from '@/app/api/webhooks/authnet/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return authnetWebhookPost(req);
}

export async function GET() {
  const health = await authnetWebhookGet();
  const healthBody = await health.json();

  return NextResponse.json({
    ...healthBody,
    endpoint: '/api/billing/authorize-net-webhook',
    compatibilityMode: true,
    canonicalEndpoint: '/api/webhooks/authnet',
  });
}
