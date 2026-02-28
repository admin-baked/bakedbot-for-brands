/**
 * Legacy Authorize.Net webhook compatibility endpoint.
 *
 * This route intentionally delegates to the hardened /api/webhooks/authnet
 * handler so all Authorize.Net events share one validation and reconciliation path.
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
    endpoint: '/api/webhooks/authorize-net',
    compatibilityMode: true,
    canonicalEndpoint: '/api/webhooks/authnet',
  });
}
