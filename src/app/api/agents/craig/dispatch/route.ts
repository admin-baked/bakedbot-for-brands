// src/app/api/agents/craig/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { handleCraigEvent } from "@/server/agents/craig";
import { requireUser } from "@/server/auth/auth";

import { logger } from '@/lib/logger';

// Force dynamic rendering - prevents build-time evaluation of agent dependencies
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Secure this endpoint: only 'owner' role can trigger it.
    await requireUser(['super_user']);
    
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
  } catch (err: any) {
    logger.error("Agent (Craig) dispatch error:", err);
    const status = err.message.includes("Unauthorized") || err.message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Agent dispatch failed" }, { status });
  }
}
