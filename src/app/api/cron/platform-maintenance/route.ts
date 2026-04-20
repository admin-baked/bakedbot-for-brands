/**
 * Platform Maintenance Megacron
 * 
 * Centralized endpoint for platform-level maintenance tasks:
 * - Billing: Transitioning delinquent tenants to suspended.
 * - Cleanup: SEO brand page rotation.
 * - System: Future health and optimization tasks.
 * 
 * One route, multiple maintenance tasks — routes by current hour (ET).
 * Schedule: 2 AM ET (UTC 07:00 / 06:00)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { transitionDelinquentTenants } from '@/server/services/billing-guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Maintenance tasks can be heavy

function detectMaintenanceWindow(utcHour: number): 'overnight' | 'standard' {
  // 2 AM ET is 07:00 UTC (standard) or 06:00 UTC (daylight)
  if (utcHour === 6 || utcHour === 7) return 'overnight';
  return 'standard';
}

async function runBrandCleanup() {
  const db = getAdminFirestore();
  logger.info('[Maintenance] Running SEO Brand Cleanup');
  
  const snapshot = await db.collection('seo_pages_brand').get();
  if (snapshot.empty) return { deleted: 0 };

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  
  return { deleted: snapshot.size };
}

async function handler(request: NextRequest) {
  const authError = await requireCronSecret(request, 'platform-maintenance');
  if (authError) return authError;

  const now = new Date();
  const utcHour = now.getUTCHours();
  const window = detectMaintenanceWindow(utcHour);

  logger.info('[PlatformMaintenance] Firing', { window, utcHour });

  const results: any = {
    window,
    timestamp: now.toISOString(),
  };

  try {
    // 1. Billing Maintenance (Run in overnight window)
    if (window === 'overnight' || request.nextUrl.searchParams.get('force') === 'billing') {
      results.billing = await transitionDelinquentTenants();
    }

    // 2. SEO Brand Cleanup (Run in overnight window)
    if (window === 'overnight' || request.nextUrl.searchParams.get('force') === 'cleanup') {
      results.cleanup = await runBrandCleanup();
    }

    // 3. Update maintenance log
    const db = getAdminFirestore();
    await db.collection('platform_maintenance_log').add({
      ...results,
      firedAt: now,
      status: 'success'
    });

    return NextResponse.json({ success: true, ...results });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('[PlatformMaintenance] Failed', { error: msg });
    
    // Log failure
    try {
      const db = getAdminFirestore();
      await db.collection('platform_maintenance_log').add({
        window,
        timestamp: now.toISOString(),
        error: msg,
        status: 'failed'
      });
    } catch (logErr) {
      logger.error('[PlatformMaintenance] Failed to log failure', { error: String(logErr) });
    }

    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return handler(request); }
export async function POST(request: NextRequest) { return handler(request); }
