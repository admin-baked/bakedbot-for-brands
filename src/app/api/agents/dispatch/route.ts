// src/app/api/agents/dispatch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/firebase/server-client";
import { handleCraigEvent } from "@/server/agents/craig";
import { handlePopsEvent } from "@/server/agents/pops";
import { handleMoneyMikeEvent } from "@/server/agents/moneyMike";
import { handleMrsParkerEvent } from "@/server/agents/mrsParker";
import { handleEzalEvent } from "@/server/agents/ezal";
import { requireUser } from "@/server/auth/auth";
import { withProtection } from "@/server/middleware/with-protection";
import { agentDispatchSchema, type AgentDispatchRequest } from "../../schemas";
import { logger } from '@/lib/logger';

export const POST = withProtection(
  async (req: NextRequest, data?: AgentDispatchRequest) => {
    try {
      // Secure this endpoint: only 'owner' role can trigger it.
      await requireUser(['super_user']);

      const { firestore: db } = await createServerClient();
      // Data is already validated by middleware
      const { orgId, limit = 20 } = data!;

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

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Agent dispatch error:", error);
      const status = error.message.includes("Unauthorized") || error.message.includes("Forbidden") ? 403 : 500;
      return NextResponse.json({ error: error.message || "Agent dispatch failed" }, { status });
    }
  },
  {
    schema: agentDispatchSchema,
    csrf: true,
    appCheck: true
  }
);
