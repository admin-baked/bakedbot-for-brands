// src/app/api/cannmenus/brands/route.ts
import { NextRequest, NextResponse } from "next/server";

const CANNMENUS_API_BASE = process.env.CANNMENUS_API_BASE;
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY;

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";

  // If not configured yet, return a stub so the dev console still works
  if (!CANNMENUS_API_BASE || !CANNMENUS_API_KEY) {
    // Simple in-memory stub brands
    const allBrands = [
      {
        id: "jeeter-demo",
        name: "Jeeter",
        slug: "jeeter",
        description: "Iconic infused pre-rolls and cannabis products.",
        logoUrl:
          "https://images.unsplash.com/photo-1513639725746-c5d3e861f32a?auto=format&fit=crop&w=400&q=80",
        heroImageUrl:
          "https://images.unsplash.com/photo-1617787456475-29f32f7b54f8?auto=format&fit=crop&w=1200&q=80",
        categories: ["Pre-rolls", "Vapes"],
        website: "https://jeeter.com",
        socials: {
          instagram: "https://instagram.com/jeeter",
        },
        markets: ["CA", "MI", "AZ"],
      },
      {
        id: "stiiizy-demo",
        name: "STIIIZY",
        slug: "stiiizy",
        description: "Pods, flower, and more from STIIIZY.",
        logoUrl:
          "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80",
        heroImageUrl:
          "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=80",
        categories: ["Vapes", "Flower"],
        website: "https://stiiizy.com",
        socials: {
          instagram: "https://instagram.com/stiiizy",
        },
        markets: ["CA", "NV"],
      },
    ];

    const normalizedQuery = search.trim().toLowerCase();
    const items = normalizedQuery
      ? allBrands.filter((b) =>
          `${b.name} ${b.slug}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : allBrands;

    return NextResponse.json(
      {
        source: "next-api:cannmenus:brands (stub)",
        query: search,
        items,
        warning:
          "Using in-memory stub data because CANNMENUS_API_BASE / CANNMENUS_API_KEY are not configured.",
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
