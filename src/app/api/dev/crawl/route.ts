// src/app/api/dev/crawl/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";

import { logger } from '@/lib/logger';
// This is a placeholder for a real, robust crawler service.
// In production, this would likely be a Cloud Run service triggered by Pub/Sub.

export async function POST(req: NextRequest) {
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
