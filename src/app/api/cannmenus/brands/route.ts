
// src/app/api/cannmenus/brands/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const base = process.env.CANNMENUS_API_BASE || process.env.CANNMENUS_API_URL;
  const apiKey = process.env.CANNMENUS_API_KEY;

  if (!base || !apiKey) {
    console.error("CannMenus env missing", { hasBase: !!base, hasKey: !!apiKey });
    return NextResponse.json(
      {
        source: "next-api:cannmenus:brands (error)",
        error: "Missing CANNMENUS_API_BASE or CANNMENUS_API_KEY environment variables.",
      },
      { status: 500 }
    );
  }

  const searchParams = req.nextUrl.searchParams;
  const url = new URL("/v1/brands", base);
  // forward any query params to CannMenus
  url.search = searchParams.toString();

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "BakedBot/1.0",
      "X-Token": apiKey.trim().replace(/^['"']|['"']$/g, ""),
    },
  });

  const data = await resp.json();

  return NextResponse.json(
    {
      source: "next-api:cannmenus:brands (live)",
      status: resp.status,
      data,
    },
    { status: resp.status }
  );
}
