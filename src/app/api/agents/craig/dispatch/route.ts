
// src/app/api/agents/craig/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { handleCraigEvent } from "@/server/agents/craig";

export async function POST(req: NextRequest) {
  const { firestore: db } = await createServerClient();

  // In production, secure this with auth or secret header
  const { orgId, limit = 20 } = (await req.json().catch(() => ({}))) as {
    orgId: string;
    limit?: number;
  };

  if (!orgId) {
    return NextResponse.json({ error: "orgId required" }, { status: 400 });
  }

  // Example: process the last N events (in a real system you'd track offsets)
  const eventsSnap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("events")
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  for (const doc of eventsSnap.docs) {
    await handleCraigEvent(orgId, doc.id);
  }

  return NextResponse.json({ processed: eventsSnap.size });
}
