// src/app/api/dev/crawl/route.ts
/**
 * DEV ONLY: Crawler stub endpoint
 *
 * SECURITY: Blocked in production and requires Super User authentication.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { requireSuperUser } from "@/server/auth/auth";

import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  // SECURITY: Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Dev route disabled in production' },
      { status: 403 }
    );
  }

  // SECURITY: Require Super User authentication
  try {
    await requireSuperUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { firestore } = await createServerClient();
  const { menu_source_id } = await req.json();

  if (!menu_source_id) {
    return NextResponse.json({ error: "menu_source_id is required." }, { status: 400 });
  }

  // --- STUB IMPLEMENTATION ---
  // 1. Fetch menu_source doc (omitted for brevity)
  // 2. Launch Playwright/Puppeteer (omitted for brevity)
  // 3. Crawl the URL (omitted for brevity)
  // 4. Save raw snapshot (omitted for brevity)
  // 5. Publish normalization job (omitted for brevity)

  logger.info(`[CRAWLER STUB] Would crawl menu source: ${menu_source_id}`);

  return NextResponse.json({
    ok: true,
    message: "Crawling job stub initiated. See server logs for details.",
    sourceId: menu_source_id,
  });
}
