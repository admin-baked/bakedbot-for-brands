// src/app/api/dev/normalize/route.ts
/**
 * DEV ONLY: Normalization stub endpoint
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
  const { snapshot_id, platform } = await req.json();

  if (!snapshot_id || !platform) {
    return NextResponse.json({ error: "snapshot_id and platform are required." }, { status: 400 });
  }

  // --- STUB IMPLEMENTATION ---
  // 1. Fetch raw_menu_snapshot doc (omitted)
  // 2. Run the correct platform adapter (e.g., parseDutchieJson, parseWeedmaps) (omitted)
  // 3. For each raw product, run the matching/normalization logic (omitted)
  // 4. Upsert into the `availability` collection (omitted)
  // 5. Update the snapshot doc's `parse_status` (omitted)

  logger.info(`[NORMALIZER STUB] Would normalize snapshot: ${snapshot_id} for platform: ${platform}`);

  return NextResponse.json({
    ok: true,
    message: "Normalization job stub initiated. See server logs for details.",
    snapshotId: snapshot_id,
  });
}
