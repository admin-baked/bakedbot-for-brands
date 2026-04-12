/**
 * Cron Security Module
 * Centralized authorization for cron routes to prevent auth bypass vulnerabilities.
 * Also exports shared cron utilities used across multiple cron routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

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
export async function requireCronSecret(
  req: NextRequest,
  serviceName: string = 'CRON'
): Promise<NextResponse | null> {
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

// =============================================================================
// Shared Cron Utilities
// =============================================================================

/**
 * Resolve the super-user's orgId at runtime.
 * Queries the users collection for role == 'super_user' and returns their orgId.
 * Falls back to 'bakedbot_super_admin' if the collection returns nothing or errors.
 *
 * Used across all executive cron routes — do not duplicate inline.
 */
export async function getSuperUserOrgId(): Promise<string> {
    try {
        const db = getAdminFirestore();
        const snap = await db.collection('users').where('role', '==', 'super_user').limit(1).get();
        if (!snap.empty) {
            const d = snap.docs[0].data();
            const orgId = d.orgId || d.currentOrgId;
            if (orgId && typeof orgId === 'string') return orgId;
        }
    } catch (e) {
        logger.warn('[cron/getSuperUserOrgId] Firestore lookup failed, using fallback', { error: String(e) });
    }
    return 'bakedbot_super_admin';
}

/**
 * Parse bullet/numbered list items from a Claude text response.
 * Strips leading -, •, *, or `N.` prefixes and removes blank lines.
 *
 * Used across executive cron routes that call Claude for bullet-point output.
 */
export function parseBullets(text: string): string[] {
    return text
        .split('\n')
        .filter(l => l.trim().match(/^[-•*\[]|\d+\./))
        .map(l => l.replace(/^\d+\.\s*|^[-•*\[]\s*/, '').trim())
        .filter(Boolean);
}

/**
 * Urgency/priority sort map shared across briefing crons.
 * Maps urgency level to a numeric sort weight (higher = more urgent).
 */
export const URGENCY_PRIORITY: Record<'critical' | 'warning' | 'info' | 'clean', number> = {
    critical: 4,
    warning: 3,
    info: 2,
    clean: 1,
};

/**
 * Returns the most severe urgency level from an array.
 */
export function topUrgency(
    levels: Array<'critical' | 'warning' | 'info' | 'clean'>
): 'critical' | 'warning' | 'info' | 'clean' {
    return levels.reduce(
        (top, level) => URGENCY_PRIORITY[level] > URGENCY_PRIORITY[top] ? level : top,
        'clean' as 'critical' | 'warning' | 'info' | 'clean'
    );
}
