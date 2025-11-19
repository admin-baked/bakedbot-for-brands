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
      headers: {
        Accept: "application/json",
      },
    });

    const text = await upstreamRes.text();
    const contentType = upstreamRes.headers.get("content-type") ?? "";

    // If Cloud Function replied with HTML or something weird, surface that
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          error: `Upstream non-JSON response (status ${upstreamRes.status})`,
          bodySnippet: text.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const json = JSON.parse(text);
    return NextResponse.json(json, { status: upstreamRes.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error talking to brands function",
      },
      { status: 500 }
    );
  }
}
