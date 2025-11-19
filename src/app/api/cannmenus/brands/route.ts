// src/app/api/cannmenus/brands/route.ts
import { NextRequest, NextResponse } from "next/server";

const CANNMENUS_API_BASE = process.env.CANNMENUS_API_BASE;
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY;

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";

  // If not configured yet, return a stub so the dev console still works
  if (!CANNMENUS_API_BASE || !CANNMENUS_API_KEY) {
    return NextResponse.json(
      {
        source: "next-api:cannmenus:brands (stub)",
        query: search,
        items: [],
        warning:
          "CANNMENUS_API_BASE or CANNMENUS_API_KEY not configured; returning stub.",
      },
      { status: 200 }
    );
  }

  try {
    const url = new URL("/brands", CANNMENUS_API_BASE);
    if (search.trim()) {
      url.searchParams.set("search", search.trim());
    }

    const upstreamRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${CANNMENUS_API_KEY}`,
      },
    });

    const text = await upstreamRes.text();
    const contentType = upstreamRes.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          error: `CannMenus non-JSON response (status ${upstreamRes.status})`,
          bodySnippet: text.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const json = JSON.parse(text);

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: json?.error ?? `CannMenus error (status ${upstreamRes.status})`,
          data: json,
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error talking to CannMenus brands API",
      },
      { status: 500 }
    );
  }
}
