// src/app/api/agents/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { handleCraigEvent } from "@/server/agents/craig";
import { handlePopsEvent } from "@/server/agents/pops";
import { handleMoneyMikeEvent } from "@/server/agents/moneyMike";
import { handleMrsParkerEvent } from "@/server/agents/mrsParker";
import { handleEzalEvent } from "@/server/agents/ezal";
import { requireUser } from "@/server/auth/auth";

import { logger } from '@/lib/logger';
export async function POST(req: NextRequest) {
  try {
    // Secure this endpoint: only 'owner' role can trigger it.
    await requireUser(['owner']);

    const { firestore: db } = await createServerClient();
    const { orgId, limit = 20 } = (await req.json().catch(() => ({}))) as {
      orgId: string;
      limit?: number;
    };

    if (!orgId) {
      return NextResponse.json({ error: "orgId required" }, { status: 400 });
    }

    // In a real system, you'd track which events have been processed by each agent
    // using a separate document or field (e.g., a `processedBy` array on the event doc).
    // For this demo, we'll just re-process the last N events for simplicity.
    const eventsSnap = await db
      .collection("organizations")
      .doc(orgId)
      .collection("events")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    for (const doc of eventsSnap.docs) {
      const eventId = doc.id;
      // These can run in parallel as they operate on different documents.
      await Promise.all([
        handleCraigEvent(orgId, eventId),
        handlePopsEvent(orgId, eventId),
        handleMoneyMikeEvent(orgId, eventId),
        handleMrsParkerEvent(orgId, eventId),
        handleEzalEvent(orgId, eventId),
      ]);
    }

    return NextResponse.json({ processed: eventsSnap.size });

  } catch (err: any) {
    logger.error("Agent dispatch error:", err);
    const status = err.message.includes("Unauthorized") || err.message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: err.message || "Agent dispatch failed" }, { status });
  }
}
