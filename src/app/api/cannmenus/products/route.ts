// src/app/api/cannmenus/products/route.ts
import { NextRequest, NextResponse } from "next/server";

const FUNCTIONS_BASE =
  "https://us-central1-studio-567050101-bc6e8.cloudfunctions.net";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;

  // Pass through any relevant query params (brandId, retailerId, search, etc.)
  const upstreamUrl = new URL("/products", FUNCTIONS_BASE);
  url.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await upstreamRes.text();

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: `Upstream non-JSON response (status ${upstreamRes.status})`,
          bodySnippet: text.slice(0, 200),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(json, { status: upstreamRes.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error talking to CannMenus proxy",
      },
      { status: 500 }
    );
  }
}
