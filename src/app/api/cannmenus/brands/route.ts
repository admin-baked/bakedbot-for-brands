
// src/app/api/cannmenus/brands/route.ts
import { NextRequest, NextResponse } from "next/server";

const FUNCTIONS_BASE =
  "https://us-central1-studio-567050101-bc6e8.cloudfunctions.net";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";

  const upstreamUrl = new URL("/brands", FUNCTIONS_BASE);
  if (search) upstreamUrl.searchParams.set("search", search);

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: "GET",
      // no CORS issues here: this is server → server
      headers: {
        Accept: "application/json",
      },
    });

    const text = await upstreamRes.text();

    // Try to parse JSON; if it’s HTML or something else, wrap it in an error
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

    // Pass through the upstream JSON + status
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
