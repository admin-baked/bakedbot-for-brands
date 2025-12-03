// src/app/api/cannmenus/retailers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const base = process.env.CANNMENUS_API_BASE || process.env.CANNMENUS_API_URL;
  const apiKey = process.env.CANNMENUS_API_KEY;

  if (!base || !apiKey) {
    logger.error("CannMenus env missing", { hasBase: !!base, hasKey: !!apiKey });
    return NextResponse.json(
      {
        source: "next-api:cannmenus:retailers (error)",
        error: "Missing CANNMENUS_API_BASE or CANNMENUS_API_KEY environment variables.",
      },
      { status: 500 }
    );
  }

  const url = new URL("/v1/retailers", base);

  // Map 'search' parameter to 'name' for CannMenus API
  const searchParams = new URLSearchParams(req.nextUrl.searchParams);
  if (searchParams.has('search')) {
    const searchValue = searchParams.get('search');
    searchParams.delete('search');
    if (searchValue) {
      searchParams.set('name', searchValue);
    }
  }

  url.search = searchParams.toString();

  try {
    const resp = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "BakedBot/1.0",
        "X-Token": apiKey.trim().replace(/^['"']|['"']$/g, ""),
      },
    });

    if (!resp.ok) {
      logger.error(`CannMenus API error: ${resp.status} ${resp.statusText}`);
      return NextResponse.json(
        { error: `CannMenus API error: ${resp.statusText}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();

    return NextResponse.json(
      {
        source: "next-api:cannmenus:retailers (live)",
        status: resp.status,
        data,
      },
      { status: resp.status }
    );
  } catch (error) {
    logger.error("Error fetching retailers from CannMenus", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
