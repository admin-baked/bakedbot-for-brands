// src/app/api/dev/normalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";

// This is a placeholder for a real, robust normalization service.
// In production, this would likely be a Cloud Run service triggered by Pub/Sub.

export async function POST(req: NextRequest) {
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

  console.log(`[NORMALIZER STUB] Would normalize snapshot: ${snapshot_id} for platform: ${platform}`);

  return NextResponse.json({
    ok: true,
    message: "Normalization job stub initiated. See server logs for details.",
    snapshotId: snapshot_id,
  });
}
