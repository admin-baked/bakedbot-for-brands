// src/app/api/cannmenus/products/route.ts
import { NextRequest, NextResponse } from "next/server";

const CANNMENUS_API_BASE = process.env.CANNMENUS_API_BASE;
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY;

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const brandId = req.nextUrl.searchParams.get("brandId") ?? "";
  const retailerId = req.nextUrl.searchParams.get("retailerId") ?? "";

  // ===== STUB MODE =====
  if (!CANNMENUS_API_BASE || !CANNMENUS_API_KEY) {
    const allProducts = [
      {
        id: "jeeter-gelato-1g-preroll",
        brandId: "jeeter-demo",
        brandSlug: "jeeter",
        name: "Jeeter Gelato Infused Pre-roll 1g",
        category: "Pre-rolls",
        strainType: "Hybrid",
        thcPercent: 31.2,
        cbdPercent: 0.1,
        size: "1g",
        imageUrl:
          "https://images.unsplash.com/photo-1513639725746-c5d3e861f32a?auto=format&fit=crop&w=600&q=80",
        tags: ["infused", "potent"],
        retailerIds: ["retailer-chi-001", "retailer-det-001"],
      },
      {
        id: "jeeter-strawberry-shortcake-5pk",
        brandId: "jeeter-demo",
        brandSlug: "jeeter",
        name: "Jeeter Strawberry Shortcake Infused 5-Pack",
        category: "Pre-rolls",
        strainType: "Hybrid",
        thcPercent: 32.5,
        cbdPercent: 0.1,
        size: "5 x 0.5g",
        imageUrl:
          "https://images.unsplash.com/photo-1545243424-0ce743321e11?auto=format&fit=crop&w=600&q=80",
        tags: ["infused", "5-pack"],
        retailerIds: ["retailer-chi-001"],
      },
      {
        id: "stiiizy-king-louis-pod-1g",
        brandId: "stiiizy-demo",
        brandSlug: "stiiizy",
        name: "STIIIZY King Louis XIII Pod 1g",
        category: "Vapes",
        strainType: "Indica",
        thcPercent: 85.0,
        cbdPercent: 0.0,
        size: "1g",
        imageUrl:
          "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80",
        tags: ["pod", "indica"],
        retailerIds: ["retailer-chi-001"],
      },
      {
        id: "stiiizy-og-kush-flower-3.5",
        brandId: "stiiizy-demo",
        brandSlug: "stiiizy",
        name: "STIIIZY OG Kush Flower 3.5g",
        category: "Flower",
        strainType: "Hybrid",
        thcPercent: 27.0,
        cbdPercent: 0.1,
        size: "3.5g",
        imageUrl:
          "https://images.unsplash.com/photo-1511715282680-fbf93a50e721?auto=format&fit=crop&w=600&q=80",
        tags: ["eighth", "hybrid"],
        retailerIds: ["retailer-chi-001", "retailer-det-001"],
      },
    ];

    const normSearch = search.trim().toLowerCase();

    let items = allProducts;

    if (brandId) {
      items = items.filter(
        (p) => p.brandId === brandId || p.brandSlug === brandId
      );
    }

    if (retailerId) {
      items = items.filter((p) => p.retailerIds?.includes(retailerId));
    }

    if (normSearch) {
      items = items.filter((p) =>
        `${p.name} ${p.category} ${p.strainType}`
          .toLowerCase()
          .includes(normSearch)
      );
    }

    return NextResponse.json(
      {
        source: "next-api:cannmenus:products (stub)",
        query: { search, brandId, retailerId },
        items,
        warning:
          "Using in-memory stub data because CANNMENUS_API_BASE / CANNMENUS_API_KEY are not configured.",
      },
      { status: 200 }
    );
  }

  // ===== REAL MODE (for later) =====
  try {
    const url = new URL("/v1/products", CANNMENUS_API_BASE);
    if (search.trim()) url.searchParams.set("search", search.trim());
    if (brandId.trim()) url.searchParams.set("brandId", brandId.trim());
    if (retailerId.trim()) url.searchParams.set("retailerId", retailerId.trim());

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
          err?.message ?? "Unknown error talking to CannMenus products API",
      },
      { status: 500 }
    );
  }
}
