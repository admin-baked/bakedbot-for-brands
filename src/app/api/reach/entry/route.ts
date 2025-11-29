
// src/app/api/reach/entry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { emitEvent } from "@/server/events/emitter";

import { logger } from '@/lib/logger';
interface ReachEntryBody {
  organizationId: string;
  channel: string;      // "qr", "instagram", "email", "website", etc.
  campaignId?: string;
  landingUrl?: string;
  menuId?: string;      // brand or menu identifier
  referrer?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReachEntryBody;

    if (!body.organizationId || !body.channel) {
      return NextResponse.json(
        { error: "organizationId and channel are required." },
        { status: 400 }
      );
    }

    await emitEvent({
      orgId: body.organizationId,
      type: "reach.entry",
      agent: "reach",
      data: {
        channel: body.channel,
        campaignId: body.campaignId || null,
        landingUrl: body.landingUrl || null,
        menuId: body.menuId || null,
        referrer: body.referrer || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error("reach:entry_error", err);
    return NextResponse.json(
      { error: err?.message || "Error logging reach entry" },
      { status: 500 }
    );
  }
}
