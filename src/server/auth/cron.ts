'use server';

/**
 * Cron Security Module
 * Centralized authorization for cron routes to prevent auth bypass vulnerabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Verify CRON_SECRET authorization for cron routes
 *
 * This function implements the safe pattern per prime.md lines 450-460:
 * 1. Check if CRON_SECRET env var is configured (not undefined/empty)
 * 2. If not configured, return 500 "Server misconfiguration"
 * 3. If configured, verify it matches the Authorization header
 * 4. If mismatch, return 401 "Unauthorized"
 *
 * @param req - NextRequest from the cron route handler
 * @param serviceName - Optional name for logging context (e.g., 'campaign-sender')
 * @returns null if authorized, or NextResponse with error (401 or 500) if not
 *
 * @example
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const authError = requireCronSecret(req, 'my-service');
 *   if (authError) return authError;
 *
 *   // Proceed with cron logic
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export function requireCronSecret(
  req: NextRequest,
  serviceName: string = 'CRON'
): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  // CRITICAL: Check if secret is configured before using it
  // If missing/empty, return 500 to indicate server misconfiguration
  // This prevents auth bypass if secret is undefined
  if (!cronSecret) {
    logger.error(`[${serviceName}] CRON_SECRET environment variable is not configured`, {
      service: serviceName,
    });
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  // Verify the Authorization header matches the secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn(`[${serviceName}] Unauthorized cron access attempt`, {
      service: serviceName,
      hasHeader: !!authHeader,
      headerPrefix: authHeader?.substring(0, 20),
    });
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Authorization successful
  return null;
}

/**
 * Alternative pattern: Inline implementation (no helper)
 * Use this pattern only in routes that already use it.
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const cronSecret = process.env.CRON_SECRET;
 *
 *   if (!cronSecret) {
 *     logger.error('[SERVICE] CRON_SECRET not configured');
 *     return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
 *   }
 *
 *   if (authHeader !== `Bearer ${cronSecret}`) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
