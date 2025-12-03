
// src/app/api/cannmenus/retailers/route.ts
import { NextRequest, NextResponse } from "next/server";

import { logger } from '@/lib/logger';
export async function GET(req: NextRequest) {
  const base = process.env.CANNMENUS_API_BASE || process.env.CANNMENUS_API_URL;
  const apiKey = process.env.CANNMENUS_API_KEY;

  if (!base || !apiKey) {
    logger.error("CannMenus env missing", { hasBase: !!base, hasKey: !!apiKey });
  }
    );
}
}
