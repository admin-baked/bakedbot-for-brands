
// src/app/api/cannmenus/products/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const base = process.env.CANNMENUS_API_BASE;
  const apiKey = process.env.CANNMENUS_API_KEY;

  if (!base || !apiKey) {
    console.error("CannMenus env missing", { hasBase: !!base, hasKey: !!apiKey });
    return NextResponse.json(
      {
        source: "next-api:cannmenus:products (error)",
        error: "Missing CANNMENUS_API_BASE or CANNMENUS_API_KEY environment variables.",
      },
      { status: 500 }
    );
  }

  const url = new URL("/v1/products", base);
  url.search = req.nextUrl.searchParams.toString();

  const resp = await fetch(url.toString(), {
    headers: {
      "Authorization": apiKey,
      "accept": "application/json",
    },
  });

  const data = await resp.json();

  return NextResponse.json(
    {
      source: "next-api:cannmenus:products (live)",
      status: resp.status,
      data,
    },
    { status: resp.status }
  );
}
