
// src/app/api/cannmenus/products/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const base = process.env.CANNMENUS_API_BASE || process.env.CANNMENUS_API_URL;
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

  const url = new URL("/v2/products", base);
  url.search = req.nextUrl.searchParams.toString();

  try {
    const resp = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "BakedBot/1.0",
        "X-Token": apiKey.trim().replace(/^['"']|['"']$/g, ""),
      },
       next: { revalidate: 60 } // Cache for 60 seconds
    });

    if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`CannMenus API Error: ${resp.status}`, errorText);
        return NextResponse.json(
            {
              source: "next-api:cannmenus:products (upstream_error)",
              status: resp.status,
              error: `CannMenus API responded with status ${resp.status}`,
            },
            { status: resp.status }
        );
    }

    const data = await resp.json();

    return NextResponse.json(
      {
        source: "next-api:cannmenus:products (live)",
        status: resp.status,
        data,
      },
      { status: resp.status }
    );
  } catch (error) {
      console.error('Fetch to CannMenus failed', error);
      return NextResponse.json(
          {
            source: 'next-api:cannmenus:products (fetch_error)',
            error: error instanceof Error ? error.message : 'Unknown fetch error'
          },
          { status: 500 }
      );
  }
}
