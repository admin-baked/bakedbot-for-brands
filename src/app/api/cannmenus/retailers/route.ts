// src/app/api/cannmenus/retailers/route.ts
import { NextRequest, NextResponse } from "next/server";

const CANNMENUS_API_BASE = process.env.CANNMENUS_API_BASE;
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY;

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const brandId = req.nextUrl.searchParams.get("brandId") ?? "";

  // ===== STUB MODE =====
  if (!CANNMENUS_API_BASE || !CANNMENUS_API_KEY) {
    const allRetailers = [
      {
        id: "retailer-chi-001",
        name: "Green Planet Dispensary",
        slug: "green-planet-dispensary",
        address: {
          street: "420 W Cloud St",
          city: "Chicago",
          state: "IL",
          postalCode: "60601",
        },
        geo: {
          lat: 41.8853,
          lng: -87.6216,
        },
        phone: "(312) 555-0111",
        website: "https://greenplanet.example.com",
        carriesBrands: ["jeeter-demo", "stiiizy-demo"],
      },
      {
        id: "retailer-det-001",
        name: "Motor City Remedies",
        slug: "motor-city-remedies",
        address: {
          street: "313 Gratiot Ave",
          city: "Detroit",
          state: "MI",
          postalCode: "48226",
        },
        geo: {
          lat: 42.3347,
          lng: -83.0469,
        },
        phone: "(313) 555-0199",
        website: "https://motorcityremedies.example.com",
        carriesBrands: ["jeeter-demo"],
      },
    ];

    const normalizedQuery = search.trim().toLowerCase();

    let items = allRetailers;

    if (brandId) {
      items = items.filter((r) => r.carriesBrands.includes(brandId));
    } else if (normalizedQuery) {
      items = items.filter((r) =>
        `${r.name} ${r.slug} ${r.address.city} ${r.address.state}`
          .toLowerCase()
          .includes(normalizedQuery)
      );
    }

    return NextResponse.json(
      {
        source: "next-api:cannmenus:retailers (stub)",
        query: { search, brandId },
        items,
        warning:
          "Using in-memory stub data because CANNMENUS_API_BASE / CANNMENUS_API_KEY are not configured.",
      },
      { status: 200 }
    );
  }

  // ===== REAL MODE (for later) =====
  try {
    const url = new URL("/v1/retailers", CANNMENUS_API_BASE);
    if (search.trim()) url.searchParams.set("search", search.trim());
    if (brandId.trim()) url.searchParams.set("brandId", brandId.trim());

    const upstreamRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": CANNMENUS_API_KEY,
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
          error:
            json?.error ?? `CannMenus error (status ${upstreamRes.status})`,
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
        error:
          err?.message ?? "Unknown error talking to CannMenus retailers API",
      },
      { status: 500 }
    );
  }
}
